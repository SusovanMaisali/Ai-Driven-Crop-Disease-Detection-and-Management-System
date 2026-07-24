# 🌿 CropSense AI v3.0 Pro
### *Intelligent Crop Disease Detection & Farm Management Dashboard*

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.0%2B-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100.0%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.11%2B-FF6F00?logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-Vision_2.5_Flash-4285F4?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

---

## 📖 Project Overview
**CropSense AI v3.0 Pro** is a production-ready, interactive farm management and agricultural diagnosis platform. It implements a **decoupled modern architecture** with a **FastAPI backend** and a **Vite + React + Tailwind CSS v4** frontend.

The system uses a **dual-engine AI architecture** to identify leaf diseases with high precision. By combining a local convolutional neural network (CNN) trained on over 54,000 leaf images (PlantVillage dataset) with Google Gemini Vision’s large multimodal capabilities, the system classifies 38 distinct crop diseases, flags non-leaf submissions, and diagnoses generic plant species in real-time.

Additionally, the system provides geolocated weather analysis, localized crop health risk calculations, custom PDF reporting, audio speech recommendation readouts, translation into 70+ languages, and interactive chat support.

---

## 🧱 Key Features

*   **⚡ Dual AI Diagnostics (CNN & Gemini Vision):** Run dual checks using a fast, offline-capable CNN model and fallback Google Gemini Vision API to confirm species and disease details.
*   **🗺️ Conv attention visualizations (Grad-CAM):** Plots visual heatmaps mapping the exact convolutional activation regions of the CNN model.
*   **📸 Dynamic Leaf validation:** Employs HSV color threshold checks and brightness constraints to instantly validate and reject non-leaf submissions.
*   **📊 Farming Analytics Dashboard:** Monitor diagnostic scans activity trends over time, plant categories monitored, and diagnosed severity distributions via custom graphs (Recharts).
*   **📜 Searchable Scan Registry:** Manage, filter, search, sort, and permanently delete local predictions stored in your personal CSV database log.
*   **📄 Bespoke PDF Auditing Reports:** Instantly compile diagnostic findings, local coordinate logs, temperature indices, weather risks, organic treatment details, NPK formulas, and crop rotation advisories into download-ready PDF booklets.
*   **🌍 Multilingual Speech Readouts:** Translates all AI recommendations, symptoms, and organic treatment plans into 70+ languages with immediate audio readouts.
*   **🎙️ Browser STT Chatbot:** Talk directly to a farming assistant powered by Gemini chatbot memory, utilizing your client-side browser Web Speech API.
*   **🌡️ Local Geolocation & Climate Analytics:** Uses IP coordinates to fetch real-time climate data (temperature, wind speeds, rainfall, UV index) from the Open-Meteo API and alerts users to frost, heat stress, drought, or storm thresholds.
*   **🔑 Passwordless Access Control:** Secured user registration, login forms, CAPTCHA sum checks, and mobile OTP verifications.

---

## 🎨 Technologies Used

### Backend (`/backend`)
* **FastAPI**: Python-based high-performance REST API routing.
* **TensorFlow / Keras**: CNN Model loading and inferences.
* **Google Gemini 2.5 Flash API**: Zero-shot image diagnosis & context-aware chatbot.
* **OpenCV / PIL**: Image preprocessing, quality scoring, and Grad-CAM calculations.
* **Pandas / Numpy**: Local CSV prediction histories and array calculations.
* **ReportLab**: PDF report template generator.
* **gTTS**: Text-to-speech summary reader.
* **Deep Translator**: Fast translation into 70+ languages.

### Frontend (`/frontend`)
* **Vite + React**: High-performance Single Page Application (SPA).
* **Tailwind CSS v4**: CSS-first layout styling.
* **Recharts**: Responsive charting widgets (Trends, categories, and severities).
* **Leaflet & React-Leaflet**: Interactive map mapping scan coordinates.
* **React Webcam**: In-app camera utility for taking leaf photos.
* **Lucide React**: Clean icons.

---

## 📂 Folder Structure

```
PlantVillage-Dataset/
├── backend/
│   ├── main.py                     # FastAPI entry point & API router
│   ├── requirements.txt            # Python dependencies (FastAPI, uvicorn, tensorflow, etc.)
│   ├── test_main.py                # Backend unit tests
├── frontend/
│   ├── vercel.json                 # Vercel SPA Routing Configuration
│   ├── package.json                # npm package definitions
│   ├── vite.config.js              # Vite configuration
│   ├── index.html                  # Core HTML file
│   └── src/
│       ├── main.jsx                # React Entry point
│       ├── App.jsx                 # App router & global session state
│       ├── index.css               # Global CSS & Tailwind CSS v4 variables
│       ├── components/
│       │   ├── Layout.jsx          # Sidebar, profile, language selector
│       │   ├── Auth.jsx            # Sign-In / Register with Captcha & OTP
│       │   ├── Home.jsx            # Upload, Webcam, Diagnosis console, Chatbot
│       │   ├── Dashboard.jsx       # Charts & map analytics
│       │   ├── History.jsx         # Search, export, sync, delete timeline logs
│       │   └── About.jsx           # About page details
│       └── utils/
│           └── api.js              # API fetch client
├── model/                          # Trained TensorFlow CNN weights
├── utils/                          # Helper modules
├── render.yaml                     # Render Service Blueprint
├── .env.example                    # Template for API credentials
├── .gitignore                      # Ignored system and local folders
└── README.md                       # Combined project description & running instructions
```

---

## ⚙️ Model Details & Dataset Information

### CNN Classifier
The local classification model is a deep Convolutional Neural Network (CNN) trained on the **PlantVillage dataset**.
*   **Classes Supported:** 38 distinct labels (covering Apple, Blueberry, Cherry, Corn, Grape, Peach, Pepper, Potato, Raspberry, Soybean, Strawberry, Squash, and Tomato).
*   **Class Mapping:** Refer to [model/class_names.txt](file:///c:/COLLAGE_ALL_DOCUMENTS/CROP%20SENSE%20AI/PlantVillage-Dataset/model/class_names.txt) for indexes.
*   **Resolution:** Inputs are automatically scaled to `(128, 128, 3)` and normalized to `[0.0, 1.0]`.

### Dataset Origin
The **PlantVillage Dataset** is an open-access repository of **54,306 images** of healthy and diseased plant leaves, introduced in *"Using Deep Learning for Image-Based Plant Disease Detection"* by Mohanty et al. (2016). It covers 14 crop species and 26 diseases.

---

## ⚙️ Local Installation & Running Guide

### 1. Backend Setup (`/backend`)
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Unix/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Define the `GEMINI_API_KEY` environment variable:
   *   **On Windows (PowerShell):** `$env:GEMINI_API_KEY="your-key-here"`
   *   **On Linux/macOS:** `export GEMINI_API_KEY="your-key-here"`
5. Start the FastAPI development server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
6. (Optional) Run the unit tests to verify:
   ```bash
   python -m pytest
   ```

### 2. Frontend Setup (`/frontend`)
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web app in your browser at:
   `http://localhost:5173`

---

## 🌐 Production Deployment Guide

### 1. Backend Deployment (Render)
1. Log in to [Render](https://render.com/).
2. Click **New** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically read `render.yaml` and configure the web service.
5. In the Render web service dashboard, click **Environment** and add:
   *   `GEMINI_API_KEY`: Your Google Gemini API Key.
   *   `ALLOWED_ORIGINS`: Your Vercel frontend URL (e.g., `https://cropsense.vercel.app`) to authorize CORS requests.
6. Trigger the deployment. Your API service will run on `https://cropsense-backend.onrender.com`.

### 2. Frontend Deployment (Vercel)
1. Log in to [Vercel](https://vercel.com/).
2. Select **Import Project** and link your GitHub repository.
3. Configure the following project directory settings:
   *   **Root Directory:** `frontend`
   *   **Framework Preset:** `Vite`
   *   **Build Command:** `npm run build`
   *   **Output Directory:** `dist`
4. Expand **Environment Variables** and add:
   *   `VITE_API_BASE_URL`: The URL of your deployed Render backend (e.g. `https://cropsense-backend.onrender.com`).
5. Click **Deploy**. Your React app will be live on Vercel.

---

## 👥 Author Information
*   **Lead Architect:** Susovan Patra
*   **Contact Email:** susovan670@gmail.com
*   **GitHub Repository:** [Ai-Driven-Crop-Disease-Detection-and-Management-System](https://github.com/SusovanMaisali/Ai-Driven-Crop-Disease-Detection-and-Management-System)

---

## 🤝 Acknowledgements
*   **Penn State University (PlantVillage):** For hosting and providing open access to the leaf image disease database.
*   **Google AI Studio:** For providing the generative Gemini Flash model API.
*   **Open-Meteo Team:** For the non-commercial geolocated weather forecasting tools.
