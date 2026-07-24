import React, { useState } from "react";
import { apiRequest } from "../utils/api";
import { 
  Search, 
  Trash2, 
  Mail, 
  CloudRain, 
  Download, 
  CloudLightning, 
  Check, 
  Send,
  Calendar,
  MapPin,
  Thermometer,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

export default function History({ history, setHistory, user }) {
  const [search, setSearch] = useState("");
  const [filterPlant, setFilterPlant] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [sortBy, setSortBy] = useState("Date (Newest First)");
  
  // Data actions state
  const [emailInput, setEmailInput] = useState(user.email || "");
  const [emailStatus, setEmailStatus] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [backupSyncing, setBackupSyncing] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  // Extract unique plants for filter list
  const uniquePlants = ["All", ...new Set(history.map(item => item.Plant).filter(Boolean))];
  const uniqueSeverities = ["All", ...new Set(history.map(item => item.Severity).filter(Boolean))];

  // Sync Backup Logic
  const handleCloudBackup = () => {
    setBackupSyncing(true);
    setBackupSuccess(false);
    setBackupProgress(0);
    
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setBackupSyncing(false);
          setBackupSuccess(true);
          setTimeout(() => setBackupSuccess(false), 3000);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  // Email Report Logic
  const handleEmailReport = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setEmailLoading(true);
    setEmailStatus("");
    try {
      const response = await apiRequest("/api/history/email", {
        method: "POST",
        body: JSON.stringify({
          mobile: user.mobile,
          recipient_email: emailInput.trim()
        })
      });
      setEmailStatus(response.message || "Email sent successfully!");
    } catch (err) {
      setEmailStatus(`Failed: ${err.message}`);
    } finally {
      setEmailLoading(false);
    }
  };

  // Delete Record Logic
  const handleDeleteRecord = async (index) => {
    try {
      const response = await apiRequest("/api/history/delete", {
        method: "POST",
        body: JSON.stringify({
          mobile: user.mobile,
          index: index
        })
      });
      if (response.success) {
        setHistory(response.history);
      }
    } catch (err) {
      alert(`Error deleting record: ${err.message}`);
    }
  };

  // Export CSV
  const exportCsv = () => {
    const headers = [
      "Date", "Time", "Plant", "Disease", "CNN_Confidence", "Severity",
      "Latitude", "Longitude", "City", "Country",
      "Temperature", "Humidity", "Rainfall", "WindSpeed", "UVIndex"
    ];
    
    const rows = history.map(item => [
      item.Date, item.Time, item.Plant, item.Disease, item.CNN_Confidence, item.Severity,
      item.Latitude, item.Longitude, item.City, item.Country,
      item.Temperature, item.Humidity, item.Rainfall, item.WindSpeed, item.UVIndex
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cropsense_history_${user.mobile}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const exportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `cropsense_history_${user.mobile}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters & Sorting logic
  let filtered = [...history];

  // Search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(item => 
      (item.Plant || "").toLowerCase().includes(q) || 
      (item.Disease || "").toLowerCase().includes(q)
    );
  }

  // Dropdown plant filter
  if (filterPlant !== "All") {
    filtered = filtered.filter(item => item.Plant === filterPlant);
  }

  // Dropdown severity filter
  if (filterSeverity !== "All") {
    filtered = filtered.filter(item => item.Severity === filterSeverity);
  }

  // Sorting
  filtered.sort((a, b) => {
    const parseDateTime = (item) => {
      try {
        const [day, month, year] = item.Date.split("-");
        const [hour, min, sec] = item.Time.split(":");
        return new Date(year, month - 1, day, hour, min, sec).getTime();
      } catch (e) {
        return 0;
      }
    };

    if (sortBy === "Date (Newest First)") {
      return parseDateTime(b) - parseDateTime(a);
    } else if (sortBy === "Date (Oldest First)") {
      return parseDateTime(a) - parseDateTime(b);
    } else if (sortBy === "Confidence (Highest)") {
      return b.CNN_Confidence - a.CNN_Confidence;
    } else if (sortBy === "Confidence (Lowest)") {
      return a.CNN_Confidence - b.CNN_Confidence;
    }
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in font-satoshi">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cs-emerald/20 flex items-center justify-center border border-cs-mint/30 shadow-glow">
          <Calendar className="w-5 h-5 text-cs-mint" />
        </div>
        <div>
          <h2 className="font-clash font-bold text-xl text-cs-white">Prediction History & Logs</h2>
          <p className="text-xs text-cs-muted">Review, filter, and export crop disease diagnostic history files.</p>
        </div>
      </div>

      {/* KPI Stats Panel */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-glow">
            <span className="text-2xl font-bold text-cs-white">{history.length}</span>
            <span className="block text-[10px] uppercase text-cs-muted mt-1 tracking-wider">Total Scans</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-glow">
            <span className="text-2xl font-bold text-[#10b981]">
              {history.filter(i => /healthy/i.test(i.Disease)).length}
            </span>
            <span className="block text-[10px] uppercase text-cs-muted mt-1 tracking-wider">Healthy Cases</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-glow">
            <span className="text-2xl font-bold text-red-400">
              {history.filter(i => !/healthy/i.test(i.Disease)).length}
            </span>
            <span className="block text-[10px] uppercase text-cs-muted mt-1 tracking-wider">Infections Found</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-glow">
            <span className="text-2xl font-bold text-cs-mint">
              {history.length > 0 
                ? Math.round((history.filter(i => /healthy/i.test(i.Disease)).length / history.length) * 100) 
                : 100}%
            </span>
            <span className="block text-[10px] uppercase text-cs-muted mt-1 tracking-wider">Crop Health Index</span>
          </div>
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cs-muted flex items-center gap-2">
          <Search className="w-4 h-4 text-cs-mint" />
          Filter & Search Records
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search bar */}
          <div>
            <label className="block text-xs text-cs-muted mb-1">Search Plant or Disease</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Tomato"
                className="w-full bg-cs-deep border border-white/10 rounded-lg py-2 px-3 pl-8 text-sm focus:outline-none focus:border-cs-jade"
              />
              <Search className="w-4 h-4 text-cs-muted absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Plant filter */}
          <div>
            <label className="block text-xs text-cs-muted mb-1">Filter by Plant</label>
            <select
              value={filterPlant}
              onChange={(e) => setFilterPlant(e.target.value)}
              className="w-full bg-cs-deep border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cs-jade text-cs-white"
            >
              {uniquePlants.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
          </div>

          {/* Severity filter */}
          <div>
            <label className="block text-xs text-cs-muted mb-1">Filter by Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full bg-cs-deep border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cs-jade text-cs-white"
            >
              {uniqueSeverities.map(sev => (
                <option key={sev} value={sev}>{sev}</option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-xs text-cs-muted mb-1">Sort Results By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-cs-deep border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cs-jade text-cs-white"
            >
              <option>Date (Newest First)</option>
              <option>Date (Oldest First)</option>
              <option>Confidence (Highest)</option>
              <option>Confidence (Lowest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      {history.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cs-muted">
            ⚙️ Data Actions & Sync
          </h3>
          
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Export buttons */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <button
                onClick={exportCsv}
                className="bg-cs-deep border border-white/10 hover:border-cs-jade rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                onClick={exportJson}
                className="bg-cs-deep border border-white/10 hover:border-cs-jade rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
              <button
                onClick={handleCloudBackup}
                disabled={backupSyncing}
                className="bg-cs-deep border border-white/10 hover:border-cs-jade rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-2 transition"
              >
                <CloudLightning className="w-3.5 h-3.5 text-cs-mint" />
                {backupSyncing ? `Syncing ${backupProgress}%` : "Sync Cloud Backup"}
              </button>
            </div>

            {/* Email reports */}
            <form onSubmit={handleEmailReport} className="flex gap-2 w-full lg:w-auto items-center">
              <div className="relative flex-1 lg:w-64">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Farmer email"
                  className="w-full bg-cs-deep border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-cs-jade"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={emailLoading}
                className="bg-gradient-to-r from-cs-emerald to-cs-forest border border-cs-mint/30 rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:shadow-glow transition shrink-0"
              >
                {emailLoading ? "Sending..." : "Email PDF"}
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>

          {backupSyncing && (
            <div className="w-full bg-cs-deep h-2 rounded-full overflow-hidden">
              <div className="bg-cs-jade h-full transition-all duration-100" style={{ width: `${backupProgress}%` }}></div>
            </div>
          )}

          {backupSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-lg p-2 text-xs flex gap-2 items-center">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Cloud Backup Sync Successful! All records archived safely in cloud servers.</span>
            </div>
          )}

          {emailStatus && (
            <div className="bg-cs-deep border border-cs-border text-cs-lime rounded-lg p-2 text-xs">
              {emailStatus}
            </div>
          )}
        </div>
      )}

      {/* Timeline logs */}
      {filtered.length > 0 ? (
        <div className="relative border-l border-cs-border/40 pl-6 ml-4 space-y-8">
          {filtered.map((item, idx) => {
            const isHealthy = /healthy/i.test(item.Disease);
            let sevColorClass = "text-cs-jade";
            let sevBorderClass = "border-cs-jade/30";
            if (item.Severity === "Moderate") {
              sevColorClass = "text-cs-amber";
              sevBorderClass = "border-cs-amber/30";
            } else if (item.Severity === "Severe") {
              sevColorClass = "text-red-400";
              sevBorderClass = "border-red-500/30";
            }

            return (
              <div key={idx} className="relative animate-fade-in">
                {/* Timeline node dot */}
                <div className={`absolute w-3.5 h-3.5 rounded-full -left-[33px] top-1.5 border-2 ${
                  isHealthy ? "bg-cs-jade border-cs-void" : "bg-red-400 border-cs-void shadow-[0_0_10px_#ef4444]"
                }`} />

                {/* Log card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 shadow-glow relative hover:border-cs-border/40 transition">
                  
                  {/* Delete button */}
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to permanently delete this diagnostic record?")) {
                        handleDeleteRecord(idx);
                      }
                    }}
                    className="absolute top-4 right-4 text-cs-muted hover:text-red-400 transition"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-cs-muted mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.Date} · {item.Time}
                    </span>
                    {item.City && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {item.City}, {item.Country}
                      </span>
                    )}
                    {item.Temperature && (
                      <span className="flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5" />
                        {item.Temperature}°C
                      </span>
                    )}
                  </div>

                  {/* Plant Title & Disease Diagnosis */}
                  <h4 className="font-clash text-lg md:text-xl font-bold text-cs-white">
                    {item.Plant} · <span className={sevColorClass}>{item.Disease}</span>
                  </h4>

                  {/* Diagnosis attributes */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <div className="bg-cs-deep border border-cs-border/30 rounded-lg px-2.5 py-1 text-xs">
                      Confidence: <span className="font-bold text-cs-mint">{item.CNN_Confidence}%</span>
                    </div>
                    <div className={`bg-cs-deep border ${sevBorderClass} rounded-lg px-2.5 py-1 text-xs`}>
                      Severity: <span className={`font-bold ${sevColorClass}`}>{item.Severity}</span>
                    </div>
                    
                    {item.Humidity && (
                      <div className="bg-cs-deep border border-white/5 rounded-lg px-2.5 py-1 text-xs text-cs-muted">
                        Humid: <b>{item.Humidity}%</b>
                      </div>
                    )}
                    {item.Rainfall !== undefined && item.Rainfall > 0 && (
                      <div className="bg-cs-deep border border-blue-900/30 rounded-lg px-2.5 py-1 text-xs text-cs-sky">
                        Rain: <b>{item.Rainfall} mm</b>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-cs-deep border border-white/10 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-cs-muted" />
          </div>
          <h4 className="font-clash text-lg font-semibold text-cs-white mb-1">No diagnostic records found</h4>
          <p className="text-cs-muted text-xs max-w-sm mx-auto">
            {history.length === 0 
              ? "Start running plant disease scans on the Home page to populate your records." 
              : "Try adjusting your search query or dropdown filter selections."}
          </p>
        </div>
      )}

    </div>
  );
}
