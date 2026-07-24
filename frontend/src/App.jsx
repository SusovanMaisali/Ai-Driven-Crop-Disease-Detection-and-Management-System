import React, { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Layout from "./components/Layout";
import Home from "./components/Home";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import About from "./components/About";

export default function App() {
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [activePage, setActivePage] = useState("home");
  const [lang, setLang] = useState("en");

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("cropsense_user");
    const savedHistory = localStorage.getItem("cropsense_history");
    const savedLang = localStorage.getItem("cropsense_lang");
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  // Save session when variables change
  const handleLoginSuccess = (userData, historyData) => {
    setUser(userData);
    setHistory(historyData || []);
    setActivePage("home");
    localStorage.setItem("cropsense_user", JSON.stringify(userData));
    localStorage.setItem("cropsense_history", JSON.stringify(historyData || []));
  };

  const handleLogout = () => {
    setUser(null);
    setHistory([]);
    setActivePage("home");
    localStorage.removeItem("cropsense_user");
    localStorage.removeItem("cropsense_history");
    localStorage.removeItem("cropsense_lang");
  };

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem("cropsense_lang", newLang);
  };

  const handleHistoryUpdate = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem("cropsense_history", JSON.stringify(newHistory));
  };

  // Render correct view based on login state
  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout
      activePage={activePage}
      setActivePage={setActivePage}
      user={user}
      lang={lang}
      setLang={handleLangChange}
      onLogout={handleLogout}
    >
      {activePage === "home" && (
        <Home 
          user={user} 
          lang={lang} 
          onHistoryUpdate={handleHistoryUpdate} 
        />
      )}
      {activePage === "dashboard" && (
        <Dashboard history={history} />
      )}
      {activePage === "history" && (
        <History 
          history={history} 
          setHistory={handleHistoryUpdate} 
          user={user} 
        />
      )}
      {activePage === "about" && (
        <About />
      )}
    </Layout>
  );
}
