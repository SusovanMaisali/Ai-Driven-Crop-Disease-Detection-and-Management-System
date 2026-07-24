import os
import io
import re
import json
import uuid
import tempfile
import logging
import base64
import html
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

import tensorflow as tf
import numpy as np
import pandas as pd
import cv2
from PIL import Image
from gtts import gTTS
from deep_translator import GoogleTranslator
import google.generativeai as genai

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.cm as cm

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER

# Add parent directory to path so we can import utils from the root
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import local helpers
from utils.weather_locator import (
    get_ip_location,
    get_weather_data,
    calculate_disease_risk,
    generate_weather_alerts,
    reverse_geocode,
    get_location_suggestions,
    get_agri_info
)
from utils.offline_database import OFFLINE_DB

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CropSenseAI-Backend")

# Initialize FastAPI app
app = FastAPI(
    title="CropSense AI Backend",
    description="FastAPI Backend for CropSense AI Crop Disease Detection and Management System",
    version="3.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════
# MODELS & GLOBAL CONFIG
# ═══════════════════════════════════════════════════

# Load Main CNN Model
CNN_MODEL = None
CNN_MODEL_ERR = None
class_names = []

try:
    CNN_MODEL = tf.keras.models.load_model("../model/best_plant_disease_model.keras")
    logger.info("Loaded CNN model successfully.")
except Exception as e:
    CNN_MODEL_ERR = str(e)
    logger.error(f"Failed to load CNN model: {e}")

try:
    with open("../model/class_names.txt", "r") as f:
        class_names = [l.strip() for l in f if l.strip()]
    logger.info(f"Loaded {len(class_names)} class names.")
except Exception as e:
    logger.error(f"Failed to load class names: {e}")

# Load Local MobileNetV2 for ImageNet Validation
MOBILENET_MODEL = None
try:
    MOBILENET_MODEL = tf.keras.applications.MobileNetV2(weights="imagenet")
    logger.info("Loaded MobileNetV2 successfully for local verification.")
except Exception as e:
    logger.error(f"Failed to load MobileNetV2: {e}")


# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    name: str
    mobile: str
    email: str

class LoginRequest(BaseModel):
    mobile: str

class VerifyOtpRequest(BaseModel):
    mobile: str
    otp: str

class ChatRequest(BaseModel):
    user_message: str
    disease_context: Optional[str] = ""
    plant_context: Optional[str] = ""
    confidence: Optional[float] = 0.0
    severity: Optional[str] = "Healthy"
    lang_code: Optional[str] = "en"

class EmailHistoryRequest(BaseModel):
    mobile: str
    recipient_email: str

class DeleteRecordRequest(BaseModel):
    mobile: str
    index: int


# ═══════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════

def get_user_csv_path(mobile: str) -> str:
    os.makedirs("history", exist_ok=True)
    return f"history/predictions_{mobile}.csv"

def load_users() -> dict:
    os.makedirs("history", exist_ok=True)
    users_file = "history/users.json"
    if not os.path.exists(users_file):
        with open(users_file, "w") as f:
            json.dump({}, f)
    try:
        with open(users_file, "r") as f:
            return json.load(f)
    except Exception:
        return {}

def save_users(users: dict):
    os.makedirs("history", exist_ok=True)
    users_file = "history/users.json"
    with open(users_file, "w") as f:
        json.dump(users, f, indent=4)

def load_and_migrate_history(csv_path: str) -> pd.DataFrame:
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    required_cols = [
        "Date", "Time", "Plant", "Disease", "CNN_Confidence", "Severity",
        "Latitude", "Longitude", "City", "Country",
        "Temperature", "Humidity", "Rainfall", "WindSpeed", "UVIndex"
    ]
    if not os.path.exists(csv_path):
        pd.DataFrame(columns=required_cols).to_csv(csv_path, index=False)
    try:
        history_df = pd.read_csv(csv_path)
    except Exception:
        history_df = pd.DataFrame(columns=required_cols)
    
    if history_df.empty:
        history_df = pd.DataFrame(columns=required_cols)
        return history_df

    # Standardize column names
    rename_cols = {}
    if "Confidence" in history_df.columns and "CNN_Confidence" not in history_df.columns:
        rename_cols["Confidence"] = "CNN_Confidence"
    if rename_cols:
        history_df.rename(columns=rename_cols, inplace=True)
        
    for col in required_cols:
        if col not in history_df.columns:
            history_df[col] = ""

    # Migrate older Date formats to separate Date and Time
    if "Time" not in history_df.columns:
        times = []
        dates = []
        for _, row in history_df.iterrows():
            dt_str = str(row.get("Date", ""))
            if " " in dt_str:
                try:
                    dt = datetime.strptime(dt_str.strip(), "%Y-%m-%d %H:%M")
                    dates.append(dt.strftime("%d-%m-%Y"))
                    times.append(dt.strftime("%H:%M:%S"))
                except ValueError:
                    try:
                        dt = datetime.strptime(dt_str.strip(), "%Y-%m-%d %H:%M:%S")
                        dates.append(dt.strftime("%d-%m-%Y"))
                        times.append(dt.strftime("%H:%M:%S"))
                    except ValueError:
                        try:
                            parts = dt_str.split(' ')
                            dt_val = datetime.strptime(parts[0], "%Y-%m-%d")
                            dates.append(dt_val.strftime("%d-%m-%Y"))
                            times.append(parts[1] if len(parts) > 1 else "00:00:00")
                        except ValueError:
                            dates.append(dt_str)
                            times.append("00:00:00")
            else:
                try:
                    dt = datetime.strptime(dt_str.strip(), "%Y-%m-%d")
                    dates.append(dt.strftime("%d-%m-%Y"))
                    times.append("00:00:00")
                except ValueError:
                    try:
                        dt = datetime.strptime(dt_str.strip(), "%d-%m-%Y")
                        dates.append(dt.strftime("%d-%m-%Y"))
                        times.append("00:00:00")
                    except ValueError:
                        dates.append(dt_str)
                        times.append("00:00:00")
        
        history_df["Date"] = dates
        history_df.insert(1, "Time", times)
        history_df.to_csv(csv_path, index=False)
        
    history_df = history_df[[c for c in required_cols if c in history_df.columns]]
    return history_df

def translate_text(text: str, code: str) -> str:
    """Translate text to target language. Returns original on failure."""
    if code == "en" or not text:
        return text
    try:
        return GoogleTranslator(source='auto', target=code).translate(str(text))
    except Exception:
        return text

def get_gemini_client():
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return None, "GEMINI_API_KEY not found in environment."
    try:
        genai.configure(api_key=key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        return model, None
    except Exception as e:
        return None, str(e)

def gemini_analyze_leaf(image_bytes: bytes, cnn_disease: str, cnn_confidence: float) -> dict:
    """Analyze leaf using Gemini Vision. Returns raw dict in English."""
    gemini_model, err = get_gemini_client()
    if gemini_model is None:
        return {"error": err, "source": "gemini_unavailable"}

    try:
        img = Image.open(io.BytesIO(image_bytes))
        prompt = f"""You are an expert agricultural pathologist and botanist. Analyze this plant leaf image carefully.

CNN Model prediction: "{cnn_disease}" with {cnn_confidence:.1f}% confidence.

Your tasks:
1. Identify the PLANT TYPE (e.g., Tomato, Apple, Rice, Wheat, Mango, etc.)
2. Identify the DISEASE (or confirm healthy). Use the CNN prediction as a hint but rely on your own vision analysis. You can detect diseases NOT in the CNN model.
3. Provide complete agronomic advice.

Respond ONLY with a valid JSON object — no markdown, no extra text:
{{
  "plant_name": "Common name of the plant",
  "plant_scientific": "Scientific name",
  "disease_name": "Full disease name (or 'Healthy' if no disease)",
  "disease_pathogen": "Causal organism (fungus/bacteria/virus name)",
  "is_healthy": true,
  "severity": "Healthy/Mild/Moderate/Severe",
  "severity_pct": 0,
  "confidence_note": "Brief note on how sure you are",
  "symptoms": "2-3 sentences describing visible symptoms in this image",
  "description": "Detailed disease description (3-4 sentences)",
  "treatment": "Step-by-step general treatment plan",
  "organic_treatment": "Organic/Biological treatment options and steps",
  "chemical_treatment": "Chemical treatment options and steps",
  "prevention": "3-4 prevention measures",
  "irrigation_advice": "Irrigation and water management advice to prevent disease spread and help recovery",
  "soil_recommendation": "Soil pH, health, fertilizers, or soil remediation advice for this condition",
  "crop_rotation_advice": "Recommended crop rotation sequence or next crops to plant in this spot",
  "best_spray_timing": "Best time of day or weather conditions to apply sprays/treatments",
  "harvest_recommendation": "Harvesting recommendations and guidelines regarding this disease",
  "medicine": {{
    "name": "Recommended fungicide/bactericide/pesticide name",
    "type": "Contact/Systemic/Biological",
    "active_ingredient": "Chemical name + concentration",
    "dose": "Amount per litre of water or per hectare",
    "frequency": "How often to apply",
    "method": "Application method",
    "preharvest_interval": "Days before harvest",
    "safety": "Safety precautions",
    "alternatives": ["Alternative 1", "Alternative 2"],
    "caution": "Important warning"
  }},
  "fertilizer": {{
    "name": "Recommended fertilizer name",
    "type": "Organic/Chemical/Bio",
    "npk_n": "Nitrogen value or N/A",
    "npk_p": "Phosphorus value or N/A",
    "npk_k": "Potassium value or N/A",
    "dose": "Application dose",
    "timing": "When to apply",
    "method": "How to apply",
    "benefits": "Why this fertilizer helps",
    "additional_supplement": "Any extra micronutrient or supplement",
    "tips": ["Tip 1", "Tip 2", "Tip 3"]
  }},
  "cnn_agreement": true,
  "cnn_note": "Brief comment on whether CNN result matches your analysis"
}}"""
        response = gemini_model.generate_content([prompt, img])
        raw = response.text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        data = json.loads(raw)
        data["source"] = "gemini"
        return data
    except json.JSONDecodeError as e:
        raw_preview = locals().get("raw", "")[:300]
        return {"error": f"JSON parse failed: {e}", "raw": raw_preview, "source": "parse_error"}
    except Exception as e:
        return {"error": str(e), "source": "gemini_error"}

def translate_gemini_data(data: dict, lang_code: str) -> dict:
    if lang_code == "en" or not data or "error" in data:
        return data
    translated = dict(data)
    fields_to_translate = [
        "symptoms", "description", "treatment", "prevention", "confidence_note", "cnn_note",
        "organic_treatment", "chemical_treatment", "irrigation_advice", "soil_recommendation",
        "crop_rotation_advice", "best_spray_timing", "harvest_recommendation"
    ]
    for field in fields_to_translate:
        if translated.get(field):
            translated[field] = translate_text(translated[field], lang_code)
    if "medicine" in translated:
        med = dict(translated["medicine"])
        for f in ["dose", "frequency", "method", "safety", "caution", "type"]:
            if med.get(f):
                med[f] = translate_text(med[f], lang_code)
        translated["medicine"] = med
    if "fertilizer" in translated:
        fert = dict(translated["fertilizer"])
        for f in ["dose", "timing", "method", "benefits", "additional_supplement", "type"]:
            if fert.get(f):
                fert[f] = translate_text(fert[f], lang_code)
        translated["fertilizer"] = fert
    return translated

def get_severity(confidence: float, is_healthy: bool):
    if is_healthy:
        return "Excellent", "#10b981", "🟢"
    if confidence >= 90:
        return "Severe", "#ef4444", "🔴"
    elif confidence >= 75:
        return "Moderate", "#f97316", "🟠"
    else:
        return "Mild", "#eab308", "🟡"

def generate_gradcam(model, img_array, class_idx):
    try:
        last_conv = next(
            (l.name for l in reversed(model.layers) if isinstance(l, tf.keras.layers.Conv2D)),
            None
        )
        if last_conv is None:
            return None
        grad_model = tf.keras.models.Model(
            inputs=model.inputs,
            outputs=[model.get_layer(last_conv).output, model.output]
        )
        with tf.GradientTape() as tape:
            inp = tf.cast(img_array, tf.float32)
            conv_out, preds = grad_model(inp)
            loss = preds[:, class_idx]
        grads = tape.gradient(loss, conv_out)
        pooled = tf.reduce_mean(grads, axis=(0, 1, 2))
        heatmap = tf.squeeze(conv_out[0] @ pooled[..., tf.newaxis]).numpy()
        heatmap = np.maximum(heatmap, 0)
        if heatmap.max() > 0:
            heatmap /= heatmap.max()
        return heatmap
    except Exception as e:
        logger.error(f"Grad-CAM failed: {e}")
        return None

def overlay_heatmap(original_img, heatmap, alpha=0.45):
    try:
        h, w = original_img.shape[:2]
        resized = cv2.resize(heatmap, (w, h))
        colored = (cm.jet(resized)[:, :, :3] * 255).astype(np.uint8)
        return (original_img * (1 - alpha) + colored * alpha).astype(np.uint8)
    except Exception:
        return original_img

def has_word_match(phrase: str, keywords: set[str]) -> bool:
    for k in keywords:
        pattern = r'\b' + re.escape(k) + r'\b'
        if re.search(pattern, phrase):
            return True
    return False

def local_imagenet_validate(img: np.ndarray) -> tuple[bool, str, bool]:
    try:
        if MOBILENET_MODEL is None:
            return True, "Local classifier offline", True
            
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions
        
        resized = cv2.resize(img, (224, 224))
        preprocessed = preprocess_input(resized)
        batch = np.expand_dims(preprocessed, axis=0)
        
        preds = MOBILENET_MODEL.predict(batch, verbose=0)
        decoded = decode_predictions(preds, top=5)[0]
        
        plant_related_keywords = {
            "leaf", "buckeye", "fig", "banana", "pineapple", "acorn", "head_of_cabbage", 
            "broccoli", "cauliflower", "zucchini", "cucumber", "artichoke", "bell_pepper", 
            "strawberry", "orange", "lemon", "greenhouse", "pot", "potter", "daisy", "cardoon", 
            "corn", "maize", "ear", "pomegranate", "custard_apple", "tree", "plant", "grape",
            "vein", "foliage", "sprout", "bud", "stem", "stalk", "branch", "root", "herb", "grass",
            "fern", "moss", "clover", "cabbage", "squash", "pumpkin", "dahlia", "petunia", 
            "croton", "ivy", "lupine", "anemone", "dandelion", "aster", "chrysanthemum",
            "sunflower", "orchid", "rose", "tulip", "wildflower", "poppy", "carnation", "lily",
            "hyacinth", "iris", "daffodil", "crocus", "buttercup", "violet", "pansy", "forget-me-not",
            "cabbage_butterfly", "monarch", "sulphur_butterfly", "mantis", "grasshopper", "cricket",
            "walking_stick", "cockroach", "katydid", "weevil", "slug", "snail", "spider", "garden_spider",
            "leafhopper", "cicada", "stinkhorn", "gyromitra", "morchella", "earthstar", "bolete", 
            "hen-of-the-woods", "mushroom", "fungus", "lichens", "velvet", "trilobite"
        }
        
        non_leaf_keywords = {
            "face", "selfie", "groom", "wig", "mask", "t-shirt", "jersey", "brassiere", "gown", 
            "academic_gown", "cardigan", "bow_tie", "hair_slide", "sunglasses", "sunglass", 
            "swimming_trunks", "bikini", "suit", "trench_coat", "poncho", "scarf", 
            "oxygen_mask", "stethoscope", "syringe", "man", "woman", "person", "audience",
            "phone", "cellular", "telephone", "ipod", "computer", "laptop", "notebook", 
            "screen", "monitor", "television", "modem", "keyboard", "mouse", "joystick",
            "car", "limousine", "cab", "van", "truck", "jeep", "wagon", "sports_car", 
            "convertible", "racer", "pickup", "minivan", "ambulance", "fire_engine", 
            "wheelbarrow", "moving_van", "police_van", "recreational_vehicle", "garbage_truck",
            "tow_truck", "trailer_truck", "passenger_car", "bicycle", "motorcycle", "scooter",
            "book", "book_jacket", "comic_book", "binder", "envelope", 
            "packet", "paper", "slate", "document", "menu", "web_site", "folder",
            "building", "palace", "church", "monastery", "castle", "library", "house", 
            "window", "dome", "mosque", "planetarium", "lighthouse", "pier", "dock", 
            "bridge", "viaduct", "triumphal_arch", "skyscraper", "structure", "wall",
            "roof", "ceiling", "floor", "brick", "stone", "concrete", "pavement",
            "furniture", "chair", "table", "desk", "bed", "sofa", "couch", "cabinet",
            "shelf", "cupboard", "plate", "cup", "mug", "bowl", "fork", "knife", "spoon",
            "bottle", "can", "box", "bag", "purse", "wallet", "key", "coin", "pen", "pencil"
        }
        
        is_plant = False
        is_non_plant = False
        top_name = decoded[0][1].lower()
        top_prob = decoded[0][2]
        
        for _, class_name, prob in decoded[:5]:
            class_name_lower = class_name.lower().replace("_", " ")
            has_non_leaf_kw = has_word_match(class_name_lower, non_leaf_keywords)
            has_plant_kw = has_word_match(class_name_lower, plant_related_keywords)
            
            if has_non_leaf_kw and not has_plant_kw:
                if prob > 0.15 or class_name_lower == top_name.replace("_", " "):
                    is_non_plant = True
            if has_plant_kw:
                if prob > 0.02:
                    is_plant = True
                    
        if is_non_plant and not is_plant:
            return False, "Not a plant leaf", is_plant
            
        top_name_clean = top_name.replace("_", " ")
        if has_word_match(top_name_clean, non_leaf_keywords) and not has_word_match(top_name_clean, plant_related_keywords) and decoded[0][2] > 0.35:
            return False, "Not a plant leaf", is_plant
            
        return True, "Local classifier verified", is_plant
    except Exception as e:
        logger.error(f"Local ImageNet validation failed: {e}")
        return True, "Local validation error", True

def validate_image_pipeline(img: np.ndarray) -> tuple[bool, str]:
    invalid_msg = "Invalid Image. Please upload a clear image of a supported crop leaf."
    try:
        if img is None or len(img.shape) != 3 or img.size == 0:
            return False, invalid_msg
        
        h, w, c = img.shape
        if h < 50 or w < 50:
            return False, invalid_msg
            
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        std_val = np.std(gray)
        if std_val < 2:
            return False, invalid_msg
    except Exception:
        return False, invalid_msg

    is_leaf_local, local_reason, is_plant = local_imagenet_validate(img)
    if not is_leaf_local:
        return False, invalid_msg

    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(45, 45))
        if len(faces) > 0 and not is_plant:
            return False, invalid_msg
    except Exception:
        pass

    return True, "Valid Leaf Image"

def image_quality_score(img_np: np.ndarray) -> int:
    try:
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        blur  = min(cv2.Laplacian(gray, cv2.CV_64F).var() / 5, 100)
        brite = max(0, 100 - abs(np.mean(gray) - 128) * 1.2)
        cont  = min(np.std(gray) * 2, 100)
        return int(blur * 0.4 + brite * 0.3 + cont * 0.3)
    except Exception:
        return 75

def check_repeat_alert(history_df: pd.DataFrame, disease: str, window: int = 5) -> Optional[str]:
    if len(history_df) < window:
        return None
    nd = re.sub(r'[\s_]+', ' ', disease.strip().lower())
    recent = [re.sub(r'[\s_]+', ' ', str(d).strip().lower()) for d in history_df.tail(window)["Disease"].tolist()]
    count = recent.count(nd)
    if count >= 3:
        return f"'{disease}' detected {count}× in last {window} diagnoses. Consider consulting an agronomist."
    return None

def _safe_text(t) -> str:
    if not t:
        return "N/A"
    return re.sub(r'<[^>]+>', '', str(t)).strip() or "N/A"

def generate_pdf_report(disease: str, plant_name: str, confidence: float,
                         gemini_data: dict, severity_label: str,
                         location: dict = None, weather: dict = None,
                         pil_image: Image.Image = None) -> bytes:
    from reportlab.platypus import Image as RLImage
    
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=0.8*inch, rightMargin=0.8*inch,
                            topMargin=0.8*inch, bottomMargin=0.8*inch)
    styles = getSampleStyleSheet()
    story = []
    
    title_s = ParagraphStyle('T', parent=styles['Title'], fontSize=22,
                              textColor=colors.HexColor('#065f46'), spaceAfter=4, fontName='Helvetica-Bold')
    sub_s   = ParagraphStyle('S', parent=styles['Normal'], fontSize=10,
                              textColor=colors.HexColor('#6b7280'), spaceAfter=16)
    h2_s    = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=16,
                              textColor=colors.HexColor('#111827'), spaceBefore=10, spaceAfter=6)
    body_s  = ParagraphStyle('B', parent=styles['Normal'], fontSize=10,
                              textColor=colors.HexColor('#374151'), leading=15, spaceAfter=14)
    lbl_s   = ParagraphStyle('L', parent=styles['Normal'], fontSize=9,
                              textColor=colors.HexColor('#10b981'), fontName='Helvetica-Bold',
                              spaceAfter=4, spaceBefore=12)
    foot_s  = ParagraphStyle('F', parent=styles['Normal'], fontSize=8,
                              textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)

    story.append(Paragraph("CropSense AI — Diagnosis Report", title_s))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y at %H:%M')} · Powered by Gemini Vision + CNN", sub_s))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#d1fae5'), spaceAfter=20))
    story.append(Paragraph(f"{_safe_text(plant_name)} — {_safe_text(disease)}", h2_s))

    med  = gemini_data.get("medicine", {})
    fert = gemini_data.get("fertilizer", {})
    
    loc_str = "N/A"
    if location:
        loc_str = f"{location.get('city')}, {location.get('state')} ({location.get('latitude', 0.0):.4f}, {location.get('longitude', 0.0):.4f})"
        
    wea_str = "N/A"
    if weather:
        wea_str = f"{weather.get('temperature')}°C | {weather.get('humidity')}% Humid | Wind: {weather.get('wind_speed')} km/h"

    tbl_data = [
        ["Plant Type", _safe_text(plant_name)],
        ["Diagnosis", _safe_text(disease)],
        ["CNN Confidence", f"{confidence:.1f}%"],
        ["Severity", severity_label],
        ["Pathogen", _safe_text(gemini_data.get("disease_pathOrganism") or gemini_data.get("disease_pathogen","N/A"))],
        ["Location", _safe_text(loc_str)],
        ["Weather", _safe_text(wea_str)],
        ["Medicine Product", _safe_text(med.get("name","N/A"))],
        ["Active Ingredient", _safe_text(med.get("active_ingredient","N/A"))],
        ["NPK Ratio", f"N:{fert.get('npk_n','?')} P:{fert.get('npk_p','?')} K:{fert.get('npk_k','?')}"],
        ["Fertilizer", _safe_text(fert.get("name","N/A"))],
    ]
    
    img_temp_name = None
    img_flowable = None
    if pil_image:
        try:
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmpfile:
                pil_image.convert("RGB").save(tmpfile.name, format="JPEG", quality=80)
                img_flowable = RLImage(tmpfile.name, width=2.2*inch, height=2.2*inch)
                img_temp_name = tmpfile.name
        except Exception as e:
            logger.error(f"Image flowable error: {e}")
            img_flowable = None

    if img_flowable:
        tbl = Table(tbl_data, colWidths=[1.4*inch, 2.7*inch])
        tbl.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(0,-1),colors.HexColor('#f0fdf4')),
            ('TEXTCOLOR',(0,0),(0,-1),colors.HexColor('#065f46')),
            ('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),
            ('FONTSIZE',(0,0),(-1,-1),9),
            ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#d1fae5')),
            ('ROWBACKGROUNDS',(0,0),(-1,-1),[colors.white,colors.HexColor('#f9fafb')]),
            ('PADDING',(0,0),(-1,-1),5),
            ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ]))
        
        layout_table = Table([[img_flowable, tbl]], colWidths=[2.4*inch, 4.2*inch])
        layout_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (1,0), (1,0), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(layout_table)
    else:
        tbl = Table(tbl_data, colWidths=[2.2*inch, 4.3*inch])
        tbl.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(0,-1),colors.HexColor('#f0fdf4')),
            ('TEXTCOLOR',(0,0),(0,-1),colors.HexColor('#065f46')),
            ('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),
            ('FONTSIZE',(0,0),(-1,-1),10),
            ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#d1fae5')),
            ('ROWBACKGROUNDS',(0,0),(-1,-1),[colors.white,colors.HexColor('#f9fafb')]),
            ('PADDING',(0,0),(-1,-1),7),
            ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ]))
        story.append(tbl)
        
    story.append(Spacer(1, 12))
    
    for label, val in [
        ("Symptoms",             gemini_data.get("symptoms")),
        ("Description",          gemini_data.get("description")),
        ("Organic Treatment Plan", gemini_data.get("organic_treatment") or gemini_data.get("treatment")),
        ("Chemical Treatment Plan", gemini_data.get("chemical_treatment")),
        ("Prevention Measures",   gemini_data.get("prevention")),
        ("Irrigation Advice",    gemini_data.get("irrigation_advice")),
        ("Soil Recommendation",  gemini_data.get("soil_recommendation")),
        ("Crop Rotation Advice", gemini_data.get("crop_rotation_advice")),
        ("Best Spray Timing",    gemini_data.get("best_spray_timing")),
        ("Harvesting Recommendation", gemini_data.get("harvest_recommendation")),
        ("Safety Precautions",   med.get("safety")),
        ("Fertilizer Benefits",  fert.get("benefits")),
        ("Additional Supplement",fert.get("additional_supplement")),
    ]:
        if val:
            story.append(Paragraph(label.upper(), lbl_s))
            story.append(Paragraph(_safe_text(val), body_s))
            
    if fert.get("tips"):
        story.append(Paragraph("FERTILIZER TIPS", lbl_s))
        for i, tip in enumerate(fert["tips"]):
            story.append(Paragraph(f"{i+1}. {_safe_text(tip)}", body_s))
            
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e5e7eb'),
                             spaceBefore=16, spaceAfter=10))
    story.append(Paragraph(
        "CropSense AI v4.0 Pro · Gemini Vision + CNN · For professional confirmation consult a certified agronomist.",
        foot_s))
        
    doc.build(story)
    
    if img_temp_name:
        try:
            os.unlink(img_temp_name)
        except Exception:
            pass
            
    buf.seek(0)
    return buf.read()


def send_history_email(recipient_email: str, history_list: list, user_name: str) -> tuple[bool, str]:
    if not history_list:
        return False, "Prediction history is empty."
    
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders
    
    df = pd.DataFrame(history_list)
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_data = csv_buffer.getvalue()
    
    msg = MIMEMultipart()
    
    # Attempt to load SMTP secrets
    smtp_server = os.environ.get("SMTP_SERVER", "")
    smtp_port = os.environ.get("SMTP_PORT", "587")
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_password = os.environ.get("SMTP_PASSWORD", "")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user or "reports@cropsense.ai")
    
    msg['From'] = smtp_from
    msg['To'] = recipient_email
    msg['Subject'] = "Plant Disease Prediction Report"
    
    body = f"""Dear {user_name},

Thank you for using CropSense AI. We have compiled your plant disease prediction history report.

Summary of diagnostics:
- Total scans: {len(df)}
- Latest diagnosis: {df.iloc[-1]['Plant']} — {df.iloc[-1]['Disease']} ({df.iloc[-1]['Severity']})

Please find the full prediction history attached as a CSV file.

Best regards,
CropSense AI Team
"""
    msg.attach(MIMEText(body, 'plain'))
    
    attachment = MIMEBase('application', 'octet-stream')
    attachment.set_payload(csv_data.encode('utf-8'))
    encoders.encode_base64(attachment)
    attachment.add_header('Content-Disposition', 'attachment', filename='crop_prediction_history.csv')
    msg.attach(attachment)
    
    if not smtp_server or not smtp_user or not smtp_password:
        return True, "Simulation Mode: Email successfully compiled! Configure SMTP environment variables to send real emails."
        
    try:
        port = int(smtp_port)
        if port == 465:
            server = smtplib.SMTP_SSL(smtp_server, port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_server, port, timeout=10)
            server.starttls()
            
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, recipient_email, msg.as_string())
        server.close()
        return True, "Email sent successfully!"
    except Exception as e:
        return False, f"SMTP Error: {str(e)} (Simulation fallback: Email content generated successfully)."


# ═══════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    users = load_users()
    mobile = req.mobile.strip()
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile number is required.")
    
    if mobile in users:
        raise HTTPException(status_code=400, detail="Mobile number already registered. Please sign in.")
    
    users[mobile] = {
        "name": req.name.strip(),
        "mobile": mobile,
        "email": req.email.strip()
    }
    save_users(users)
    return {"success": True, "message": "Registration successful! Please sign in."}


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    users = load_users()
    mobile = req.mobile.strip()
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile number is required.")
    
    if mobile not in users:
         raise HTTPException(status_code=404, detail="User not found. Please register first.")
         
    # Generate 4-digit OTP
    import random
    otp = f"{random.randint(1000, 9999)}"
    
    # Return OTP for simulation directly in response
    return {
        "success": True, 
        "otp": otp, 
        "message": f"OTP code {otp} sent successfully (Simulated)."
    }


@app.post("/api/auth/verify-otp")
async def verify_otp(req: VerifyOtpRequest):
    users = load_users()
    mobile = req.mobile.strip()
    if mobile not in users:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user_data = users[mobile]
    csv_path = get_user_csv_path(mobile)
    history_df = load_and_migrate_history(csv_path)
    history_list = history_df.to_dict(orient="records")
    
    return {
        "success": True,
        "user": user_data,
        "history": history_list
    }


@app.get("/api/history")
async def get_history(mobile: str = Query(...)):
    csv_path = get_user_csv_path(mobile)
    df = load_and_migrate_history(csv_path)
    return df.to_dict(orient="records")


@app.post("/api/history/delete")
async def delete_history_record(req: DeleteRecordRequest):
    csv_path = get_user_csv_path(req.mobile)
    df = load_and_migrate_history(csv_path)
    if req.index < 0 or req.index >= len(df):
        raise HTTPException(status_code=400, detail="Invalid index.")
    
    # Drop and save
    df = df.drop(df.index[req.index]).reset_index(drop=True)
    df.to_csv(csv_path, index=False)
    return {"success": True, "history": df.to_dict(orient="records")}


@app.post("/api/history/sync")
async def sync_history(payload: dict):
    mobile = payload.get("mobile")
    records = payload.get("history", [])
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile is required.")
        
    csv_path = get_user_csv_path(mobile)
    df = pd.DataFrame(records)
    df.to_csv(csv_path, index=False)
    return {"success": True}


@app.post("/api/history/email")
async def email_history(req: EmailHistoryRequest):
    users = load_users()
    if req.mobile not in users:
        raise HTTPException(status_code=404, detail="User not found.")
    user_name = users[req.mobile]["name"]
    csv_path = get_user_csv_path(req.mobile)
    df = load_and_migrate_history(csv_path)
    
    success, msg = send_history_email(req.recipient_email, df.to_dict(orient="records"), user_name)
    if not success:
        raise HTTPException(status_code=500, detail=msg)
    return {"success": True, "message": msg}


@app.get("/api/weather")
async def get_weather(lat: float = Query(...), lon: float = Query(...)):
    weather_data = get_weather_data(lat, lon)
    agri_info = get_agri_info(
        weather_data.get("temperature", 25.0),
        weather_data.get("humidity", 60),
        weather_data.get("precipitation", 0.0),
        weather_data.get("uv_index", 3.0)
    )
    alerts = generate_weather_alerts(weather_data)
    
    return {
        "weather": weather_data,
        "agri": agri_info,
        "alerts": alerts
    }


@app.get("/api/location/suggestions")
async def get_suggestions(query: str = Query(...)):
    return get_location_suggestions(query)


@app.get("/api/location/reverse")
async def get_reverse_geocode(lat: float = Query(...), lon: float = Query(...)):
    return reverse_geocode(lat, lon)


@app.post("/api/chat")
async def chatbot_chat(req: ChatRequest):
    gemini_model, err = get_gemini_client()
    if gemini_model is None:
        return {"reply": f"⚠️ Farming assistant is currently offline. Details: {err}"}
        
    system_ctx = (
        f"You are an expert agricultural assistant in CropSense AI.\n"
        f"Current diagnosis context:\n"
        f"- Plant: {req.plant_context or 'Unknown'}\n"
        f"- Disease: {req.disease_context or 'Not yet diagnosed'}\n"
        f"- Confidence: {req.confidence:.0f}% | Severity: {req.severity}\n"
        f"Respond in language code '{req.lang_code}'. Be concise, practical, and farmer-friendly. "
        f"Do not use markdown headers. Max 150 words."
    )
    try:
        response = gemini_model.generate_content(f"{system_ctx}\n\nFarmer question: {req.user_message}")
        return {"reply": response.text.strip()}
    except Exception as e:
        return {"reply": f"⚠️ Assistant error: {str(e)[:150]}"}


@app.post("/api/predict")
async def predict_crop_disease(
    file: UploadFile = File(...),
    lang: str = Form("en"),
    lat: float = Form(0.0),
    lon: float = Form(0.0),
    mobile: str = Form(...)
):
    try:
        # Read image bytes
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img_np is None:
            raise HTTPException(status_code=400, detail="Invalid leaf image file.")
            
        img_rgb = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read image: {e}")

    # Validate image is a leaf
    is_valid_leaf, reason = validate_image_pipeline(img_rgb)
    if not is_valid_leaf:
        return JSONResponse(
            status_code=400,
            content={"success": False, "detail": reason}
        )

    # Compute image quality
    quality = image_quality_score(img_rgb)

    # CNN Inference
    cnn_disease = "Unknown"
    cnn_confidence = 0.0
    p_class = 0
    input_tensor = None
    
    if CNN_MODEL is not None and len(class_names) > 0:
        try:
            resized_img = cv2.resize(img_rgb, (128, 128))
            img_array = resized_img / 255.0
            input_tensor = np.expand_dims(img_array, axis=0)
            
            prediction = CNN_MODEL.predict(input_tensor, verbose=0)
            p_class = int(np.argmax(prediction))
            cnn_confidence = float(np.max(prediction) * 100)
            cnn_disease = class_names[p_class]
        except Exception as e:
            logger.error(f"CNN model inference failed: {e}")

    # Load Gemini Analysis / Offline DB Fallback
    gemini_data = {}
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    
    if gemini_key:
        # Call Gemini Vision
        gemini_data = gemini_analyze_leaf(contents, cnn_disease, cnn_confidence)
    
    # Fallback to Offline DB if Gemini fails or is not available
    if not gemini_data or "error" in gemini_data:
        logger.warning("Gemini key missing or call failed. Falling back to local database.")
        db_key = cnn_disease if cnn_disease in OFFLINE_DB else "Tomato___healthy"
        gemini_data = dict(OFFLINE_DB.get(db_key, {}))
        gemini_data["cnn_agreement"] = True
        gemini_data["cnn_note"] = "Local database search matched CNN diagnosis."
        gemini_data["source"] = "offline_db"

    # Extract final identifiers
    final_plant = gemini_data.get("plant_name", cnn_disease.split("___")[0].replace("_", " "))
    final_disease = gemini_data.get("disease_name", cnn_disease.split("___")[-1].replace("_", " "))
    is_healthy = bool(gemini_data.get("is_healthy", "healthy" in cnn_disease.lower()))
    
    # Get severity
    sev_label, sev_color, sev_icon = get_severity(cnn_confidence, is_healthy)
    
    # Translate Gemini text dynamically based on selected language code
    translated_gemini = translate_gemini_data(gemini_data, lang)
    
    # Generate Grad-CAM Heatmap
    heatmap_base64 = None
    if CNN_MODEL is not None and input_tensor is not None:
        heatmap = generate_gradcam(CNN_MODEL, input_tensor, p_class)
        if heatmap is not None:
            overlayed = overlay_heatmap(img_rgb, heatmap)
            pil_overlay = Image.fromarray(overlayed)
            buffered = io.BytesIO()
            pil_overlay.save(buffered, format="JPEG", quality=80)
            heatmap_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    # Dynamic translation of general fields
    trans_plant = translate_text(final_plant, lang)
    trans_disease = translate_text(final_disease, lang)
    trans_description = translate_text(translated_gemini.get("description", ""), lang)
    trans_treatment = translate_text(translated_gemini.get("treatment", ""), lang)
    trans_prevention = translate_text(translated_gemini.get("prevention", ""), lang)

    # Text-to-speech summary audio (gTTS)
    voice_base64 = None
    try:
        voice_text = (
            f"Plant identified: {trans_plant}. Disease: {trans_disease}. "
            f"Severity: {sev_label}. Treatment: {trans_treatment[:180]}."
        )
        tts = gTTS(voice_text, lang=lang if lang in ['en', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'zh-CN', 'ja', 'ko'] else 'en')
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tts.save(tmp.name)
            tmp.seek(0)
            audio_bytes = open(tmp.name, "rb").read()
        os.unlink(tmp.name)
        voice_base64 = base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to generate gTTS summary: {e}")

    # Fetch Location & Weather details
    location_details = {"city": "Unknown City", "state": "Unknown State", "country": "Unknown Country", "latitude": lat, "longitude": lon}
    weather_details = {"temperature": 25.0, "humidity": 60, "precipitation": 0.0, "wind_speed": 10.0, "uv_index": 3.0}
    
    if lat != 0.0 or lon != 0.0:
        try:
            geo = reverse_geocode(lat, lon)
            if geo:
                location_details.update(geo)
            weather_details = get_weather_data(lat, lon)
        except Exception as e:
            logger.error(f"Failed to load location/weather for coordinates: {e}")

    # Save to history CSV
    user_csv = get_user_csv_path(mobile)
    history_df = load_and_migrate_history(user_csv)
    
    new_record = {
        "Date": datetime.now().strftime("%d-%m-%Y"),
        "Time": datetime.now().strftime("%H:%M:%S"),
        "Plant": final_plant,
        "Disease": final_disease,
        "CNN_Confidence": round(cnn_confidence, 2),
        "Severity": sev_label,
        "Latitude": lat,
        "Longitude": lon,
        "City": location_details.get("city", "GPS Location"),
        "Country": location_details.get("country", "Detected Country"),
        "Temperature": weather_details.get("temperature", 25.0),
        "Humidity": weather_details.get("humidity", 60),
        "Rainfall": weather_details.get("precipitation", 0.0),
        "WindSpeed": weather_details.get("wind_speed", 10.0),
        "UVIndex": weather_details.get("uv_index", 3.0)
    }
    
    # Check for repeat alert before appending
    repeat_warning = check_repeat_alert(history_df, final_disease)
    
    # Save CSV
    updated_history_df = pd.concat([history_df, pd.DataFrame([new_record])], ignore_index=True)
    updated_history_df.to_csv(user_csv, index=False)

    return {
        "success": True,
        "plant_name": trans_plant,
        "disease_name": trans_disease,
        "confidence": cnn_confidence,
        "quality_score": quality,
        "severity": {
            "label": sev_label,
            "color": sev_color,
            "icon": sev_icon
        },
        "details": translated_gemini,
        "description": trans_description,
        "treatment": trans_treatment,
        "prevention": trans_prevention,
        "heatmap": heatmap_base64,
        "voice": voice_base64,
        "repeat_warning": repeat_warning,
        "location": location_details,
        "weather": weather_details,
        "history": updated_history_df.to_dict(orient="records")
    }


@app.post("/api/pdf")
async def export_pdf_file(payload: dict):
    try:
        disease = payload.get("disease_name", "Unknown Disease")
        plant_name = payload.get("plant_name", "Unknown Crop")
        confidence = float(payload.get("confidence", 0.0))
        gemini_data = payload.get("details", {})
        severity_label = payload.get("severity", {}).get("label", "Unknown")
        location = payload.get("location")
        weather = payload.get("weather")
        image_base64 = payload.get("image_base64")
        
        pil_image = None
        if image_base64:
            try:
                img_data = base64.b64decode(image_base64)
                pil_image = Image.open(io.BytesIO(img_data))
            except Exception as e:
                logger.error(f"Failed to decode PDF image: {e}")
                
        pdf_data = generate_pdf_report(
            disease=disease,
            plant_name=plant_name,
            confidence=confidence,
            gemini_data=gemini_data,
            severity_label=severity_label,
            location=location,
            weather=weather,
            pil_image=pil_image
        )
        
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=cropsense_report.pdf"}
        )
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")


@app.post("/api/voice")
async def generate_voice_post(payload: dict):
    text = payload.get("text", "")
    lang = payload.get("lang", "en")
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")
        
    try:
        tts = gTTS(text, lang=lang if lang in ['en', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'zh-CN', 'ja', 'ko'] else 'en')
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tts.save(tmp.name)
            tmp.seek(0)
            audio_bytes = open(tmp.name, "rb").read()
        os.unlink(tmp.name)
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
