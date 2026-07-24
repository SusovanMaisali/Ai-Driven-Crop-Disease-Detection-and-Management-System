import React from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReChartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { BarChart3, Activity, Heart, AlertTriangle } from "lucide-react";

// Fix standard Leaflet icon paths under bundlers (Vite)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const SEVERITY_COLORS = {
  "Excellent": "#10b981", 
  "Mild": "#eab308", 
  "Moderate": "#f97316", 
  "Severe": "#ef4444"
};

const CHART_COLORS = ["#10b981", "#34d399", "#059669", "#047857", "#064e3b", "#a3e635", "#84cc16"];

export default function Dashboard({ history }) {
  
  if (!history || history.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center animate-fade-in font-satoshi">
        <div className="w-16 h-16 rounded-2xl bg-cs-deep border border-white/10 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-cs-muted" />
        </div>
        <h4 className="font-clash text-lg font-semibold text-cs-white mb-1">No analytics data available</h4>
        <p className="text-cs-muted text-xs max-w-sm mx-auto">
          Diagnose crop leaves on the Home tab to unlock dashboard insights, diagnostic distributions, and maps.
        </p>
      </div>
    );
  }

  // 1. KPI Calculations
  const totalScans = history.length;
  const healthyCount = history.filter(item => /healthy/i.test(item.Disease)).length;
  const diseasedCount = totalScans - healthyCount;
  const healthIndex = Math.round((healthyCount / totalScans) * 100);

  // 2. Scan Trend over time
  // Group counts by Date
  const dateMap = {};
  history.forEach(item => {
    const d = item.Date;
    dateMap[d] = (dateMap[d] || 0) + 1;
  });
  // Convert to sorted list of objects
  const trendData = Object.entries(dateMap).map(([date, count]) => {
    // Parse date for sorting
    const [day, month, year] = date.split("-");
    const parsedDate = new Date(year, month - 1, day);
    return { date, count, parsedDate };
  }).sort((a, b) => a.parsedDate - b.parsedDate)
    .map(item => ({ Date: item.date, Scans: item.count }));

  // 3. Plant distribution
  const plantMap = {};
  history.forEach(item => {
    const p = item.Plant || "Unknown";
    plantMap[p] = (plantMap[p] || 0) + 1;
  });
  const plantData = Object.entries(plantMap).map(([name, value]) => ({ name, value }));

  // 4. Disease frequency
  const diseaseMap = {};
  history.forEach(item => {
    if (!/healthy/i.test(item.Disease)) {
      const d = item.Disease || "Unknown";
      diseaseMap[d] = (diseaseMap[d] || 0) + 1;
    }
  });
  const diseaseData = Object.entries(diseaseMap)
    .map(([name, count]) => ({ Disease: name, Scans: count }))
    .sort((a, b) => b.Scans - a.Scans)
    .slice(0, 8); // Top 8 diseases

  // 5. Severity distribution
  const severityMap = { Excellent: 0, Mild: 0, Moderate: 0, Severe: 0 };
  history.forEach(item => {
    const s = item.Severity || "Excellent";
    if (s in severityMap) {
      severityMap[s]++;
    } else {
      severityMap[s] = 1;
    }
  });
  const severityData = Object.entries(severityMap).map(([name, count]) => ({ 
    Severity: name, 
    Count: count,
    fill: SEVERITY_COLORS[name] || "#10b981"
  }));

  // 6. Map coordinates filtering
  const mapMarkers = history.filter(item => 
    item.Latitude && item.Longitude && 
    parseFloat(item.Latitude) !== 0.0 && 
    parseFloat(item.Longitude) !== 0.0
  );

  // Set initial map position (default Kolkata coordinates, or center on first record coords)
  const defaultPos = mapMarkers.length > 0 
    ? [parseFloat(mapMarkers[0].Latitude), parseFloat(mapMarkers[0].Longitude)]
    : [22.5726, 88.3639];

  return (
    <div className="space-y-6 animate-fade-in font-satoshi">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cs-emerald/20 flex items-center justify-center border border-cs-mint/30 shadow-glow">
          <Activity className="w-5 h-5 text-cs-mint" />
        </div>
        <div>
          <h2 className="font-clash font-bold text-xl text-cs-white">Farming Analytics Dashboard</h2>
          <p className="text-xs text-cs-muted">Monitor diagnostic activities, plant species variety, and disease levels.</p>
        </div>
      </div>

      {/* KPI Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-glow flex justify-between items-center">
          <div>
            <span className="text-3xl font-bold text-cs-white leading-none">{totalScans}</span>
            <span className="block text-[10px] uppercase tracking-wider text-cs-muted mt-2">Total Scans</span>
          </div>
          <Activity className="w-8 h-8 text-cs-sky shrink-0 opacity-80" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-glow flex justify-between items-center">
          <div>
            <span className="text-3xl font-bold text-cs-jade leading-none">{healthyCount}</span>
            <span className="block text-[10px] uppercase tracking-wider text-cs-muted mt-2">Healthy Plants</span>
          </div>
          <Heart className="w-8 h-8 text-cs-jade shrink-0 opacity-80" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-glow flex justify-between items-center">
          <div>
            <span className="text-3xl font-bold text-red-400 leading-none">{diseasedCount}</span>
            <span className="block text-[10px] uppercase tracking-wider text-cs-muted mt-2">Diseased Plants</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-400 shrink-0 opacity-80" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-glow flex justify-between items-center">
          <div>
            <span className="text-3xl font-bold text-cs-mint leading-none">{healthIndex}%</span>
            <span className="block text-[10px] uppercase tracking-wider text-cs-muted mt-2">Crop Health Index</span>
          </div>
          <Sprout className="w-8 h-8 text-cs-lime shrink-0 opacity-80" />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trend Line Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-glow space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cs-white">
            📈 Daily Diagnostic Activity
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="Date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <ReChartsTooltip 
                  contentStyle={{ backgroundColor: "#111b11", borderColor: "rgba(52,211,153,0.25)", color: "#f0fdf4" }} 
                />
                <Line type="monotone" dataKey="Scans" stroke="#34d399" strokeWidth={2.5} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plant Category Doughnut Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-glow space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cs-white">
            🍩 Plant Species Monitored
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={plantData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {plantData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ReChartsTooltip 
                  contentStyle={{ backgroundColor: "#111b11", borderColor: "rgba(52,211,153,0.25)", color: "#f0fdf4" }} 
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Top Disease bar chart */}
        <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-5 shadow-glow space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cs-white">
            🦠 Prevalence of Leaf Infections (Top Diseases)
          </h3>
          {diseaseData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diseaseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis dataKey="Disease" type="category" stroke="rgba(255,255,255,0.4)" width={120} fontSize={10} />
                  <ReChartsTooltip 
                    contentStyle={{ backgroundColor: "#111b11", borderColor: "rgba(52,211,153,0.25)", color: "#f0fdf4" }} 
                  />
                  <Bar dataKey="Scans" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-cs-muted">
              No crop infections recorded. All monitored plants appear healthy!
            </div>
          )}
        </div>

        {/* Severity distribution bar chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 shadow-glow space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cs-white">
            🚨 Diagnosed Severity Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="Severity" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <ReChartsTooltip 
                  contentStyle={{ backgroundColor: "#111b11", borderColor: "rgba(52,211,153,0.25)", color: "#f0fdf4" }} 
                />
                <Bar dataKey="Count" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Map Row */}
      {mapMarkers.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-glow space-y-4 z-10 relative">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cs-white">
            🗺️ Geographical Scan Map
          </h3>
          <p className="text-xs text-cs-muted">Geographical distribution of diagnostic crop scans recorded by your profile.</p>
          
          <div className="h-96 w-full overflow-hidden rounded-xl">
            <MapContainer 
              center={defaultPos} 
              zoom={6} 
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapMarkers.map((marker, idx) => (
                <Marker 
                  key={idx} 
                  position={[parseFloat(marker.Latitude), parseFloat(marker.Longitude)]}
                >
                  <Popup>
                    <div className="text-xs font-satoshi text-cs-void font-semibold">
                      <p className="font-bold border-b pb-1 mb-1">{marker.Plant}</p>
                      <p className="text-red-600">{marker.Disease}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{marker.Date} {marker.Time}</p>
                      <p className="text-[10px] text-gray-500">{marker.City}, {marker.Country}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

    </div>
  );
}
