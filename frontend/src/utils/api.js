const API_BASE = "http://localhost:8000";

/**
 * Custom request wrapper for CropSense AI FastAPI backend
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const headers = { ...options.headers };
  
  // Do not set Content-Type if we are uploading FormData (let browser set boundaries)
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || errorBody.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Diagnostic leaf prediction via multipart file upload
 */
export async function predictLeaf({ file, lang, lat, lon, mobile }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("lang", lang);
  formData.append("lat", lat);
  formData.append("lon", lon);
  formData.append("mobile", mobile);

  const url = `${API_BASE}/api/predict`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Image analysis failed.");
  }

  return response.json();
}

/**
 * Generate PDF Report
 */
export async function downloadPdfReport(payload) {
  const url = `${API_BASE}/api/pdf`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to download PDF report");
  }

  return response.blob();
}

/**
 * Text to speech (gTTS stream)
 */
export function getVoiceStreamUrl(text, lang) {
  return `${API_BASE}/api/voice?text=${encodeURIComponent(text)}&lang=${lang}`;
}
