import React, { useState } from "react";
import { 
  Sprout, 
  LayoutDashboard, 
  History, 
  Info, 
  LogOut, 
  Menu, 
  X, 
  User, 
  Globe 
} from "lucide-react";

export const WORLD_LANGUAGES = {
  "🇬🇧 English": "en", 
  "🇮🇳 Hindi": "hi", 
  "🇧🇩 Bengali": "bn",
  "🇪🇸 Spanish": "es", 
  "🇫🇷 French": "fr", 
  "🇩🇪 German": "de",
  "🇮🇹 Italian": "it", 
  "🇵🇹 Portuguese": "pt", 
  "🇷🇺 Russian": "ru",
  "🇨🇳 Chinese": "zh-CN", 
  "🇯🇵 Japanese": "ja",
  "🇰🇷 Korean": "ko", 
  "🇸🇦 Arabic": "ar", 
  "🇹🇷 Turkish": "tr",
  "🇳🇱 Dutch": "nl", 
  "🇸🇪 Swedish": "sv", 
  "🇳🇴 Norwegian": "no",
  "🇩🇰 Danish": "da", 
  "🇵🇱 Polish": "pl", 
  "🇺🇦 Ukrainian": "uk",
  "🇬🇷 Greek": "el", 
  "🇹🇭 Thai": "th", 
  "🇻🇳 Vietnamese": "vi",
  "🇮🇩 Indonesian": "id", 
  "🇲🇾 Malay": "ms", 
  "🇵🇭 Filipino": "tl",
  "🇮🇷 Persian": "fa", 
  "🇵🇰 Urdu": "ur", 
  "🇮🇳 Tamil": "ta",
  "🇮🇳 Telugu": "te", 
  "🇮🇳 Kannada": "kn", 
  "🇮🇳 Malayalam": "ml",
  "🇮🇳 Gujarati": "gu", 
  "🇮🇳 Marathi": "mr", 
  "🇮🇳 Punjabi": "pa",
  "🇷🇴 Romanian": "ro", 
  "🇭🇺 Hungarian": "hu", 
  "🇨🇿 Czech": "cs",
  "🇳🇵 Nepali": "ne", 
  "🇱🇰 Sinhala": "si", 
  "🇰🇪 Swahili": "sw",
};

export default function Layout({ 
  children, 
  activePage, 
  setActivePage, 
  user, 
  lang, 
  setLang, 
  onLogout 
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: "home", label: "🌿 Home", icon: Sprout },
    { id: "dashboard", label: "📊 Dashboard", icon: LayoutDashboard },
    { id: "history", label: "📜 History", icon: History },
    { id: "about", label: "📘 About", icon: Info },
  ];

  return (
    <div className="min-h-screen bg-cs-void text-cs-white flex flex-col md:flex-row relative font-satoshi">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-cs-deep border-b border-cs-border/40 px-4 py-3 z-30">
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-cs-mint" />
          <span className="font-clash font-bold text-base text-cs-white tracking-wide">CropSense AI</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Lang Selector */}
          <div className="relative inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-cs-muted">
            <Globe className="w-3.5 h-3.5 text-cs-mint" />
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent text-cs-white focus:outline-none cursor-pointer"
            >
              {Object.entries(WORLD_LANGUAGES).map(([name, code]) => (
                <option key={code} value={code} className="bg-cs-deep text-cs-white">{name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-cs-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-cs-void/90 backdrop-blur-md z-20 flex flex-col pt-16 px-4 space-y-6">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3.5 rounded-xl font-medium flex items-center gap-3 transition-all ${
                  activePage === item.id 
                    ? "bg-gradient-to-r from-cs-emerald to-cs-forest text-cs-lime border border-cs-mint/20" 
                    : "text-cs-muted hover:bg-white/5"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label.split(" ").slice(1).join(" ")}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-cs-border/40 pt-4 mt-auto pb-8 space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-cs-emerald/20 flex items-center justify-center border border-cs-mint/30">
                <User className="w-4 h-4 text-cs-mint" />
              </div>
              <div>
                <p className="text-xs font-bold text-cs-white leading-none">{user.name}</p>
                <p className="text-[10px] text-cs-muted mt-0.5">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 rounded-xl text-red-400 hover:bg-red-950/20 flex items-center gap-3 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-cs-void border-r border-cs-border/40 h-screen sticky top-0 shrink-0 p-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-cs-deep flex items-center justify-center border border-cs-border shadow-glow">
            <Sprout className="w-5 h-5 text-cs-mint" />
          </div>
          <div>
            <h2 className="font-clash font-bold text-base text-cs-white tracking-wider leading-none">CropSense AI</h2>
            <span className="text-[10px] text-cs-mint font-semibold mt-1 block">v3.0 Pro Dashboard</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="flex-1 space-y-1.5">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-all ${
                activePage === item.id 
                  ? "bg-gradient-to-r from-cs-emerald to-cs-forest text-cs-lime border border-cs-mint/20 shadow-glow" 
                  : "text-cs-muted hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label.split(" ").slice(1).join(" ")}</span>
            </button>
          ))}
        </nav>

        {/* Desktop Footer Profile & Options */}
        <div className="border-t border-cs-border/40 pt-4 mt-auto space-y-4">
          {/* Language selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-cs-muted mb-1.5 px-2">
              Select Language
            </label>
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
              <Globe className="w-3.5 h-3.5 text-cs-mint mr-2" />
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value)}
                className="bg-transparent text-cs-white w-full focus:outline-none cursor-pointer"
              >
                {Object.entries(WORLD_LANGUAGES).map(([name, code]) => (
                  <option key={code} value={code} className="bg-cs-deep text-cs-white">{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* User badge */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cs-emerald/20 flex items-center justify-center border border-cs-mint/30">
                <User className="w-4.5 h-4.5 text-cs-mint" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-cs-white truncate leading-none">{user.name}</p>
                <p className="text-[10px] text-cs-muted truncate mt-0.5">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="text-cs-muted hover:text-red-400 transition ml-2 shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
        {children}
      </main>

    </div>
  );
}
