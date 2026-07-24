import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import { predictLeaf, downloadPdfReport, apiRequest } from "../utils/api";
import { 
  Upload, 
  Camera, 
  MapPin, 
  Thermometer, 
  Sun, 
  Wind, 
  Droplets,
  FileText, 
  Play, 
  Pause,
  MessageSquare,
  Mic,
  Send,
  RefreshCw,
  FileUp,
  AlertOctagon,
  Sparkles,
  Info,
  CheckCircle2
} from "lucide-react";

export default function Home({ user, lang, onHistoryUpdate }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraImage, setCameraImage] = useState(null);
  
  // Geolocation & Weather
  const [coords, setCoords] = useState({ lat: 0.0, lon: 0.0 });
  const [locationName, setLocationName] = useState("Kolkata, West Bengal (Default)");
  const [weather, setWeather] = useState(null);
  const [agriInfo, setAgriInfo] = useState(null);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Diagnostic states
  const [diagnosing, setDiagnosing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [repeatWarning, setRepeatWarning] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Audio Playback
  const [audioObj, setAudioObj] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState("summary");

  // Chatbot
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const webcamRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Fetch coordinates & weather on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCoords({ lat, lon });
          fetchWeatherData(lat, lon);
          fetchReverseGeocode(lat, lon);
        },
        (error) => {
          console.warn("Geolocation access denied. Using defaults.");
          fetchWeatherData(22.5726, 88.3639);
        }
      );
    } else {
      fetchWeatherData(22.5726, 88.3639);
    }
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  const fetchWeatherData = async (lat, lon) => {
    setWeatherLoading(true);
    try {
      const data = await apiRequest(`/api/weather?lat=${lat}&lon=${lon}`);
      setWeather(data.weather);
      setAgriInfo(data.agri);
      setWeatherAlerts(data.alerts);
    } catch (err) {
      console.error("Failed to load weather data:", err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchReverseGeocode = async (lat, lon) => {
    try {
      const data = await apiRequest(`/api/location/reverse?lat=${lat}&lon=${lon}`);
      if (data && data.city) {
        setLocationName(`${data.city}, ${data.state || data.country}`);
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
  };

  // Handle Drag & Drop / File Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsCameraActive(false);
      setCameraImage(null);
      setResult(null);
      setError("");
      setRepeatWarning("");
    }
  };

  // Capture Photo from Camera
  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCameraImage(imageSrc);
      setPreviewUrl(imageSrc);
      setIsCameraActive(false);
      setResult(null);
      setError("");
      setRepeatWarning("");
    }
  };

  // Helper: Convert DataURI to File Blob
  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(","),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
    while(n--){
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  };

  // Run Leaf Disease Diagnostic
  const handleAnalyze = async () => {
    let fileToUpload = null;
    
    if (cameraImage) {
      fileToUpload = dataURLtoFile(cameraImage, "captured_leaf.jpg");
    } else if (selectedFile) {
      fileToUpload = selectedFile;
    }

    if (!fileToUpload) {
      setError("Please select a leaf image file or capture a photo first.");
      return;
    }

    setDiagnosing(true);
    setError("");
    setResult(null);
    setRepeatWarning("");
    
    // Stop currently playing audio
    if (audioObj) {
      audioObj.pause();
      setAudioPlaying(false);
    }

    try {
      const response = await predictLeaf({
        file: fileToUpload,
        lang: lang,
        lat: coords.lat,
        lon: coords.lon,
        mobile: user.mobile
      });
      
      setResult(response);
      setRepeatWarning(response.repeat_warning || "");
      onHistoryUpdate(response.history);
      
      // Auto setup gTTS audio object
      if (response.voice) {
        const audio = new Audio("data:audio/mp3;base64," + response.voice);
        audio.onended = () => setAudioPlaying(false);
        setAudioObj(audio);
      }
    } catch (err) {
      setError(err.message || "Failed to analyze leaf image. Ensure leaf is visible.");
    } finally {
      setDiagnosing(false);
    }
  };

  // Play/Pause gTTS readback
  const toggleAudio = () => {
    if (!audioObj) return;
    if (audioPlaying) {
      audioObj.pause();
      setAudioPlaying(false);
    } else {
      audioObj.play();
      setAudioPlaying(true);
    }
  };

  // Download PDF report
  const handlePdfDownload = async () => {
    if (!result) return;
    try {
      let image_base64 = "";
      if (previewUrl) {
        // Fetch preview and get base64 string
        const blob = await fetch(previewUrl).then(r => r.blob());
        image_base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(",")[1]);
          reader.readAsDataURL(blob);
        });
      }

      const blob = await downloadPdfReport({
        disease_name: result.disease_name,
        plant_name: result.plant_name,
        confidence: result.confidence,
        severity: result.severity,
        details: result.details,
        location: result.location,
        weather: result.weather,
        image_base64: image_base64
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `cropsense_${result.plant_name.replace(/\s+/g, "_")}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(`Failed to compile PDF Report: ${err.message}`);
    }
  };

  // Farming chatbot response
  const handleSendChat = async (messageText) => {
    const text = messageText || chatInput;
    if (!text.trim()) return;

    const newUserMsg = { role: "user", content: text };
    setChatHistory(prev => [...prev, newUserMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await apiRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          user_message: text,
          disease_context: result ? result.disease_name : "",
          plant_context: result ? result.plant_name : "",
          confidence: result ? result.confidence : 0.0,
          severity: result ? result.severity.label : "Healthy",
          lang_code: lang
        })
      });
      setChatHistory(prev => [...prev, { role: "assistant", content: response.reply }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "assistant", content: `⚠️ Error fetching response: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Browser STT Speech Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "hi" ? "hi-IN" : lang === "bn" ? "bn-BD" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (e) => {
      console.error(e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      handleSendChat(speechToText);
    };

    recognition.start();
  };

  return (
    <div className="space-y-6 animate-fade-in font-satoshi">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#020d08] via-[#051a0e] to-[#071f10] border border-cs-border/40 p-6 md:p-8 shadow-glow flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute w-[500px] h-[500px] -top-[250px] -right-[100px] rounded-full bg-radial from-cs-jade/10 to-transparent pointer-events-none blur-3xl" />
        
        <div>
          <div className="inline-flex items-center gap-2 bg-cs-emerald/20 border border-cs-mint/30 text-cs-mint text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-cs-jade animate-pulse" />
            Platform Online
          </div>
          <h2 className="font-clash font-bold text-2xl md:text-3xl text-cs-white tracking-tight leading-none mb-2">
            Intelligent Folia Diagnostics
          </h2>
          <p className="text-cs-muted text-xs leading-relaxed max-w-md">
            Upload an image or toggle the live web camera to run a rapid neural scan on a crop leaf.
          </p>
        </div>

        {/* Dynamic Location & Weather Widget */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 md:w-80 shrink-0 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-cs-lime font-bold uppercase tracking-wider">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{locationName}</span>
          </div>
          
          {weatherLoading ? (
            <div className="flex items-center gap-2 text-cs-muted">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching micro-climate updates...</span>
            </div>
          ) : weather ? (
            <div className="grid grid-cols-2 gap-2 text-cs-muted">
              <div className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-cs-sky" />
                <span>{weather.temperature}°C</span>
              </div>
              <div className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-cs-sky" />
                <span>{weather.humidity}% Humid</span>
              </div>
              <div className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-cs-amber" />
                <span>UV Index {weather.uv_index}</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-cs-muted" />
                <span>{weather.wind_speed} km/h</span>
              </div>
            </div>
          ) : (
            <span className="text-cs-muted">Weather feed temporarily offline.</span>
          )}

          {weatherAlerts.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-800/40 text-amber-300 rounded p-1.5 text-[10px] leading-tight">
              {weatherAlerts[0]}
            </div>
          )}
        </div>
      </div>

      {/* Diagnostics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Upload / Webcam Capture */}
        <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cs-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-cs-mint" />
            Image Source Selector
          </h3>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsCameraActive(false);
                setPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                !isCameraActive 
                  ? "bg-cs-emerald/20 border-cs-mint text-cs-lime shadow-glow" 
                  : "bg-cs-deep border-white/10 hover:border-cs-border"
              }`}
            >
              <FileUp className="w-4 h-4 inline-block mr-1.5" />
              File Upload
            </button>
            
            <button
              onClick={() => {
                setIsCameraActive(true);
                setPreviewUrl(cameraImage || null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                isCameraActive 
                  ? "bg-cs-emerald/20 border-cs-mint text-cs-lime shadow-glow" 
                  : "bg-cs-deep border-white/10 hover:border-cs-border"
              }`}
            >
              <Camera className="w-4 h-4 inline-block mr-1.5" />
              Webcam Capture
            </button>
          </div>

          {/* Source Interactive Box */}
          <div className="aspect-square w-full bg-cs-deep border border-white/5 rounded-xl overflow-hidden flex flex-col items-center justify-center relative group">
            
            {isCameraActive ? (
              /* Webcam Stream */
              cameraImage ? (
                <div className="relative w-full h-full">
                  <img src={cameraImage} alt="Captured frame" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => {
                      setCameraImage(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute bottom-4 right-4 bg-cs-void/80 hover:bg-cs-void border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  >
                    Retake Photo
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                  />
                  <button 
                    onClick={capturePhoto}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cs-emerald to-cs-forest border border-cs-mint/30 px-6 py-2 rounded-full font-bold text-xs hover:shadow-glow transition"
                  >
                    📸 Capture Photo
                  </button>
                </div>
              )
            ) : (
              /* Drag & Drop File Upload */
              previewUrl ? (
                <div className="relative w-full h-full">
                  <img src={previewUrl} alt="Leaf Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <label className="bg-cs-void border border-white/10 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:border-cs-border transition">
                      Change File
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-white/5 transition p-6 text-center">
                  <Upload className="w-10 h-10 text-cs-muted mb-3" />
                  <p className="text-xs font-bold text-cs-white">Drag & drop image here</p>
                  <p className="text-[10px] text-cs-muted mt-1 uppercase">or tap to browse files</p>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )
            )}

          </div>

          <button
            onClick={handleAnalyze}
            disabled={diagnosing || (!selectedFile && !cameraImage)}
            className="w-full bg-gradient-to-r from-cs-emerald to-cs-forest border border-cs-mint/30 rounded-xl py-3 font-semibold text-sm hover:translate-y-[-1px] hover:shadow-glow transition disabled:opacity-50 disabled:pointer-events-none"
          >
            {diagnosing ? "🧠 Analyzing Leaf Features..." : "🩺 Run AI Diagnosis"}
          </button>

          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3.5 text-xs flex gap-2.5 items-start">
              <AlertOctagon className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-bold">Diagnosis Blocked</p>
                <p className="mt-0.5 text-red-400/90 leading-tight">{error}</p>
              </div>
            </div>
          )}

          {repeatWarning && (
            <div className="bg-amber-950/40 border border-amber-800 text-amber-300 rounded-xl p-3.5 text-xs flex gap-2.5 items-start">
              <AlertOctagon className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Prevalence Warning</p>
                <p className="mt-0.5 text-amber-400/90 leading-tight">{repeatWarning}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Results & Tabular Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {result ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 space-y-6">
              
              {/* Result Summary Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-clash font-bold text-xl md:text-2xl text-cs-white leading-tight">
                    {result.plant_name}
                  </h3>
                  <p className="text-xs text-cs-muted mt-1 italic">
                    {result.details.plant_scientific || "Botanical Class"}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-cs-deep border border-white/5 rounded-xl px-3.5 py-1.5 text-right shrink-0">
                    <span className="block text-[8px] uppercase tracking-wider text-cs-muted">Confidence</span>
                    <span className="font-mono font-bold text-cs-mint text-sm">{result.confidence.toFixed(1)}%</span>
                  </div>
                  <div className="bg-cs-deep border border-white/5 rounded-xl px-3.5 py-1.5 text-right shrink-0">
                    <span className="block text-[8px] uppercase tracking-wider text-cs-muted">Severity</span>
                    <span 
                      className="font-bold text-sm" 
                      style={{ color: result.severity.color }}
                    >
                      {result.severity.icon} {result.severity.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Diagnosis Disease Header */}
              <div className="bg-cs-deep border border-cs-border/40 rounded-xl p-4 flex items-center justify-between shadow-glow relative overflow-hidden">
                <div className="absolute w-[200px] h-[200px] -top-[100px] -right-[50px] rounded-full bg-radial from-cs-jade/10 to-transparent pointer-events-none blur-2xl" />
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-cs-mint font-bold mb-1">Diagnosed Condition</span>
                  <span className="font-clash font-bold text-base md:text-lg text-cs-white">
                    {result.disease_name}
                  </span>
                </div>
                <div className="bg-cs-emerald/20 border border-cs-mint/30 text-cs-mint text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  {result.details.source === "gemini" ? "🔮 Cloud Gemini" : "💾 Local Model"}
                </div>
              </div>

              {/* Slider TABS Header */}
              <div className="flex border-b border-white/5">
                {[
                  { id: "summary", label: "🩺 Diagnostic Summary" },
                  { id: "medicine", label: "💊 Medicines" },
                  { id: "fertilizer", label: "🌱 Fertilizers" },
                  { id: "chatbot", label: "🤖 AI Assistant & Speech" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition ${
                      activeTab === tab.id 
                        ? "border-cs-jade text-cs-mint" 
                        : "border-transparent text-cs-muted hover:text-cs-white"
                    }`}
                  >
                    {tab.label.split(" ").slice(1).join(" ")}
                  </button>
                ))}
              </div>

              {/* Tab: Summary */}
              {activeTab === "summary" && (
                <div className="space-y-4 animate-fade-in text-xs leading-relaxed text-cs-muted">
                  
                  {/* Grid attributes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-cs-deep border border-white/5 p-3.5 rounded-xl space-y-1 relative">
                      <div className="absolute w-1 h-full left-0 top-0 bg-[#22d3ee] rounded-l" />
                      <span className="block font-bold text-cs-white uppercase text-[9px] tracking-wider mb-1">📝 Description</span>
                      <p>{result.description}</p>
                    </div>

                    <div className="bg-cs-deep border border-white/5 p-3.5 rounded-xl space-y-1 relative">
                      <div className="absolute w-1 h-full left-0 top-0 bg-cs-jade rounded-l" />
                      <span className="block font-bold text-cs-white uppercase text-[9px] tracking-wider mb-1">💊 Treatment</span>
                      <p>{result.treatment}</p>
                    </div>

                    <div className="bg-cs-deep border border-white/5 p-3.5 rounded-xl space-y-1 relative">
                      <div className="absolute w-1 h-full left-0 top-0 bg-cs-amber rounded-l" />
                      <span className="block font-bold text-cs-white uppercase text-[9px] tracking-wider mb-1">🌿 Prevention</span>
                      <p>{result.prevention}</p>
                    </div>

                    <div className="bg-cs-deep border border-white/5 p-3.5 rounded-xl space-y-1 relative">
                      <div className="absolute w-1 h-full left-0 top-0 bg-cs-coral rounded-l" />
                      <span className="block font-bold text-cs-white uppercase text-[9px] tracking-wider mb-1">🦠 Causal Pathogen</span>
                      <p className="font-bold text-cs-white text-sm">{result.details.disease_pathogen || "N/A"}</p>
                    </div>
                  </div>

                  {/* Grad-CAM overlays */}
                  {result.heatmap && (
                    <div className="border-t border-white/5 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="block font-bold text-cs-white uppercase text-[9px] tracking-wider">
                          🗺️ Grad-CAM Attention Map Overlay
                        </span>
                        <button
                          onClick={() => setShowHeatmap(!showHeatmap)}
                          className="text-[10px] text-cs-mint hover:underline font-bold"
                        >
                          {showHeatmap ? "Hide Overlay" : "Show Overlay"}
                        </button>
                      </div>
                      
                      {showHeatmap && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-xl overflow-hidden border border-white/5">
                            <img src={previewUrl} alt="Original crop leaf" className="w-full aspect-square object-cover" />
                            <span className="block text-center text-[10px] py-1 bg-cs-deep text-cs-muted">Original Crop Leaf</span>
                          </div>
                          <div className="rounded-xl overflow-hidden border border-white/5">
                            <img src={`data:image/jpeg;base64,${result.heatmap}`} alt="Attention Heatmap" className="w-full aspect-square object-cover" />
                            <span className="block text-center text-[10px] py-1 bg-cs-deep text-cs-muted">Grad-CAM Hotspots (CNN Focus)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PDF report compile button */}
                  <button
                    onClick={handlePdfDownload}
                    className="w-full bg-cs-deep border border-white/10 hover:border-cs-jade rounded-xl py-2.5 font-bold text-xs text-cs-white flex items-center justify-center gap-2 transition"
                  >
                    <FileText className="w-4 h-4 text-cs-mint" />
                    Download PDF Report
                  </button>

                </div>
              )}

              {/* Tab: Medicine */}
              {activeTab === "medicine" && (
                <div className="space-y-4 animate-fade-in text-xs leading-relaxed text-cs-muted">
                  
                  {result.details.medicine ? (
                    <div className="bg-cs-deep border border-white/5 p-4 rounded-xl space-y-3 relative overflow-hidden">
                      <div className="absolute w-[200px] h-[200px] -top-[100px] -right-[50px] rounded-full bg-radial from-cs-coral/10 to-transparent pointer-events-none blur-2xl" />
                      
                      {/* Name Header */}
                      <div className="border-b border-white/5 pb-2 mb-2 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-cs-white text-base leading-none">
                            {result.details.medicine.name || "Recommended Medicine"}
                          </p>
                          <p className="text-[10px] text-cs-muted mt-1 uppercase tracking-wider">
                            Type: {result.details.medicine.type || "Systemic / Contact"}
                          </p>
                        </div>
                      </div>

                      {/* Attributes */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-cs-sky">Active Ingredient</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.medicine.active_ingredient || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-cs-mint">Dose</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.medicine.dose || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-cs-lime">Frequency</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.medicine.frequency || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-cs-amber">Application Method</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.medicine.method || "N/A"}</span>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-3 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-red-400">Pre-Harvest Interval</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.medicine.preharvest_interval || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-red-400">Safety Precautions</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.medicine.safety || "N/A"}</span>
                        </div>
                      </div>

                      {/* Caution Badge */}
                      {result.details.medicine.caution && (
                        <div className="bg-amber-950/20 border border-amber-800/40 text-amber-300 rounded p-2 text-[10px] leading-tight">
                          ⚠️ <b>Caution:</b> {result.details.medicine.caution}
                        </div>
                      )}

                      {/* Alternatives */}
                      {result.details.medicine.alternatives && result.details.medicine.alternatives.length > 0 && (
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-cs-muted mb-1.5">Alternative Products</span>
                          <div className="flex flex-wrap gap-1.5">
                            {result.details.medicine.alternatives.map((alt, i) => (
                              <span key={i} className="bg-white/5 border border-white/10 rounded px-2.5 py-0.5 text-[10px] text-cs-white">
                                💊 {alt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="text-center p-6 bg-cs-deep rounded-xl text-cs-muted text-xs">
                      No specific medicine details required for healthy plant diagnostics.
                    </div>
                  )}

                </div>
              )}

              {/* Tab: Fertilizer */}
              {activeTab === "fertilizer" && (
                <div className="space-y-4 animate-fade-in text-xs leading-relaxed text-cs-muted">
                  
                  {result.details.fertilizer ? (
                    <div className="bg-cs-deep border border-white/5 p-4 rounded-xl space-y-4 relative overflow-hidden">
                      <div className="absolute w-[200px] h-[200px] -top-[100px] -right-[50px] rounded-full bg-radial from-cs-lime/10 to-transparent pointer-events-none blur-2xl" />
                      
                      {/* Name Header */}
                      <div className="border-b border-white/5 pb-2 mb-2">
                        <p className="font-bold text-cs-white text-base leading-none">
                          {result.details.fertilizer.name || "Recommended Fertilizer"}
                        </p>
                        <p className="text-[10px] text-cs-muted mt-1 uppercase tracking-wider">
                          Type: {result.details.fertilizer.type || "Organic / Chemical"}
                        </p>
                      </div>

                      {/* NPK Grid */}
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-cs-lime mb-2">NPK Ratio Formula</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-cs-void border border-white/10 rounded-lg p-2.5 text-center">
                            <span className="block text-[8px] text-cs-muted uppercase font-bold">N - Nitrogen</span>
                            <span className="text-lg font-bold text-cs-mint mt-0.5 block">{result.details.fertilizer.npk_n || "N/A"}</span>
                          </div>
                          <div className="bg-cs-void border border-white/10 rounded-lg p-2.5 text-center">
                            <span className="block text-[8px] text-cs-muted uppercase font-bold">P - Phosphorus</span>
                            <span className="text-lg font-bold text-cs-coral mt-0.5 block">{result.details.fertilizer.npk_p || "N/A"}</span>
                          </div>
                          <div className="bg-cs-void border border-white/10 rounded-lg p-2.5 text-center">
                            <span className="block text-[8px] text-cs-muted uppercase font-bold">K - Potassium</span>
                            <span className="text-lg font-bold text-cs-amber mt-0.5 block">{result.details.fertilizer.npk_k || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Attributes */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-cs-mint">Dose Rate</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.fertilizer.dose || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-cs-amber">Timing</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.fertilizer.timing || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-cs-sky">Method</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.fertilizer.method || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-cs-lime">Benefits</span>
                          <span className="text-cs-white font-semibold text-xs">{result.details.fertilizer.benefits || "N/A"}</span>
                        </div>
                      </div>

                      {result.details.fertilizer.additional_supplement && (
                        <div className="border-t border-white/5 pt-3">
                          <span className="block text-[8px] uppercase tracking-wider text-cs-sky">Additional Soil Supplement</span>
                          <span className="text-cs-white font-semibold text-xs mt-0.5 block">
                            {result.details.fertilizer.additional_supplement}
                          </span>
                        </div>
                      )}

                      {/* Tips */}
                      {result.details.fertilizer.tips && result.details.fertilizer.tips.length > 0 && (
                        <div className="border-t border-white/5 pt-3">
                          <span className="block text-[8px] uppercase tracking-wider text-cs-muted mb-2">💡 Pro Application Tips</span>
                          <ul className="space-y-1.5">
                            {result.details.fertilizer.tips.map((tip, i) => (
                              <li key={i} className="flex gap-2 items-start text-cs-white/80">
                                <span className="bg-cs-emerald/20 text-cs-lime border border-cs-mint/30 rounded-full w-4 h-4 shrink-0 flex items-center justify-center font-bold text-[9px]">
                                  {i + 1}
                                </span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="text-center p-6 bg-cs-deep rounded-xl text-cs-muted text-xs">
                      No fertilizer recommendations provided.
                    </div>
                  )}

                </div>
              )}

              {/* Tab: Chatbot & Voice summary */}
              {activeTab === "chatbot" && (
                <div className="space-y-5 animate-fade-in text-xs font-satoshi text-cs-muted">
                  
                  {/* Voice Summaries play button */}
                  {result.voice && (
                    <div className="bg-cs-deep border border-white/5 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cs-emerald/25 border border-cs-mint/30 flex items-center justify-center">
                          <Play className={`w-4 h-4 text-cs-mint ${audioPlaying ? "animate-pulse" : ""}`} />
                        </div>
                        <div>
                          <p className="font-bold text-cs-white text-xs">Audio Summary Guide</p>
                          <p className="text-[10px] text-cs-muted mt-0.5">Hear the diagnosis read aloud by CropSense AI voice</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={toggleAudio}
                        className="bg-gradient-to-r from-cs-emerald to-cs-forest border border-cs-mint/30 text-cs-white px-4 py-1.5 rounded-lg font-bold text-[11px] transition shadow-glow flex items-center gap-1.5"
                      >
                        {audioPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            Pause Audio
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Listen Now
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Chat interface */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-cs-white text-xs flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-cs-mint" />
                      Farming Assistant Chatbot
                    </h4>
                    
                    {/* Chat Bubble List */}
                    <div className="bg-cs-deep border border-white/5 rounded-xl p-3.5 h-56 overflow-y-auto space-y-3 relative">
                      {chatHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-[10px]">
                          <Sparkles className="w-6 h-6 text-cs-mint mb-2 animate-bounce" />
                          <p className="font-bold text-cs-white">Ask anything regarding this diagnosis</p>
                          <p className="text-cs-muted mt-0.5">Type or click standard questions below</p>
                        </div>
                      ) : (
                        chatHistory.map((chat, idx) => (
                          <div 
                            key={idx} 
                            className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div 
                              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                chat.role === "user" 
                                  ? "bg-cs-emerald text-cs-white font-semibold rounded-tr-none border border-cs-mint/20" 
                                  : "bg-white/5 border border-white/10 text-cs-white rounded-tl-none"
                              }`}
                            >
                              {chat.role === "assistant" && (
                                <span className="block text-[8px] font-bold text-cs-lime uppercase mb-1">
                                  🔮 CropSense Assistant
                                </span>
                              )}
                              <span>{chat.content}</span>
                            </div>
                          </div>
                        ))
                      )}

                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-none px-3 py-2 text-xs text-cs-muted flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cs-mint" />
                            <span>Thinking...</span>
                          </div>
                        </div>
                      )}
                      
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Chips suggestions */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        `What are early signs of ${result.disease_name.slice(0, 20)}?`,
                        "What organic remedies exist?",
                        "Is this crop safe to eat after sprays?",
                        "How to prevent next season?"
                      ].map((sugg, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendChat(sugg)}
                          className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cs-border rounded-full px-2.5 py-1 text-[10px] text-cs-white transition truncate max-w-full"
                        >
                          💬 {sugg}
                        </button>
                      ))}
                    </div>

                    {/* Text input and STT dictation bar */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startSpeechRecognition}
                        className={`px-3.5 rounded-lg flex items-center justify-center transition border ${
                          isListening 
                            ? "bg-red-950/20 border-red-800 text-red-400 animate-pulse" 
                            : "bg-cs-deep border-white/10 text-cs-sky hover:border-cs-sky"
                        }`}
                        title="Speech to Text (Microphone)"
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                        placeholder="Type agricultural questions..."
                        className="flex-1 bg-cs-deep border border-white/10 focus:border-cs-jade rounded-lg px-3.5 text-xs text-cs-white focus:outline-none"
                      />

                      <button
                        onClick={() => handleSendChat()}
                        className="bg-gradient-to-r from-cs-emerald to-cs-forest border border-cs-mint/30 px-3.5 rounded-lg flex items-center justify-center hover:shadow-glow transition"
                      >
                        <Send className="w-4 h-4 text-cs-white" />
                      </button>
                    </div>

                  </div>

                </div>
              )}

            </div>
          ) : (
            /* Analysis Placeholder empty state */
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center animate-fade-in flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-cs-deep border border-white/10 flex items-center justify-center mb-4 shadow-glow">
                <Sparkles className="w-8 h-8 text-cs-mint" />
              </div>
              <h4 className="font-clash text-lg font-semibold text-cs-white mb-2">Diagnostic Console Ready</h4>
              <p className="text-cs-muted text-xs max-w-sm mx-auto leading-relaxed">
                Provide a photo of the crop leaf from files or stream live web camera inputs. CropSense AI will extract structural features, overlay attention heatmaps, and compile full medication logs.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
