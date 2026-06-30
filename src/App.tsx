import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  Search, 
  Globe, 
  User, 
  Phone, 
  Mail, 
  Terminal as TerminalIcon, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  Copy, 
  Cpu, 
  Clock, 
  Lock, 
  Zap,
  Check,
  ChevronRight,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types definition
type TabType = "ai-osint" | "domain" | "ip" | "username" | "phone" | "email";

interface LogEntry {
  text: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
}

interface Source {
  title: string;
  uri: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("ai-osint");
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { text: "KMSK Anonymous Intelligence Core version 1.4.0 initialized.", type: "success", timestamp: "02:31:42" },
    { text: "Developer: Muhammad Sadiq Developer Pvt ltd. All systems online.", type: "info", timestamp: "02:31:43" },
    { text: "Standard passive OSINT listeners activated.", type: "info", timestamp: "02:31:43" }
  ]);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(date.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll terminal logs to bottom when updated
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Handle auto-placeholders based on selected tab
  const getPlaceholder = () => {
    switch (activeTab) {
      case "ai-osint":
        return "Enter name, corporate alias, nickname, or general OSINT query (e.g. John Doe Seattle)";
      case "domain":
        return "Enter target domain (e.g. google.com)";
      case "ip":
        return "Enter target IP Address (e.g. 8.8.8.8 or leave empty for your IP)";
      case "username":
        return "Enter online username to search (e.g. mussadiqwazir86)";
      case "phone":
        return "Enter phone number with country code (e.g. +14155552671)";
      case "email":
        return "Enter target email address (e.g. user@domain.com)";
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "ai-osint": return "KMSK Advanced AI OSINT Grounded Search";
      case "domain": return "Domain & DNS Zone Scanner";
      case "ip": return "IP Address Geolocation & Reputation Tracker";
      case "username": return "Cross-Platform Username Footprint Scanner";
      case "phone": return "Regional Phone Carrier & Scam Record Database";
      case "email": return "Email Address Integrity & Leak Log Review";
    }
  };

  const addLog = (text: string, type: "info" | "success" | "warning" | "error" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { text, type, timestamp: time }]);
  };

  const handleCopyReport = () => {
    if (result && result.report) {
      navigator.clipboard.writeText(result.report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addLog("Intelligence dossier copied to clipboard successfully.", "success");
    }
  };

  const triggerLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const queryInput = inputVal.trim();
    addLog(`Initiating lookup sequence for tab [${activeTab.toUpperCase()}] with parameter: "${queryInput || "AUTO"}"`, "info");

    try {
      let endpoint = "";
      let payload: any = {};

      switch (activeTab) {
        case "ai-osint":
          if (!queryInput) {
            addLog("Search parameter is required for the AI OSINT scan.", "error");
            setLoading(false);
            return;
          }
          endpoint = "/api/lookup/ai-osint";
          payload = { query: queryInput };
          addLog("Triggering deep web intelligence search via Google Search grounding...", "info");
          break;
        case "domain":
          if (!queryInput) {
            addLog("Domain address is required.", "error");
            setLoading(false);
            return;
          }
          endpoint = "/api/lookup/domain";
          payload = { domain: queryInput };
          addLog(`Resolving DNS zones (A, MX, TXT, NS, AAAA) for: ${queryInput}`, "info");
          break;
        case "ip":
          endpoint = "/api/lookup/ip";
          payload = { ip: queryInput };
          addLog(`Scanning IP Block Geolocation and Carrier details: ${queryInput || "Auto Client IP"}`, "info");
          break;
        case "username":
          if (!queryInput) {
            addLog("Username handle is required.", "error");
            setLoading(false);
            return;
          }
          endpoint = "/api/lookup/username";
          payload = { username: queryInput };
          addLog(`Probing active profiles across major social databases (Github, Reddit, GitLab, etc.)...`, "info");
          break;
        case "phone":
          if (!queryInput) {
            addLog("Phone number is required.", "error");
            setLoading(false);
            return;
          }
          endpoint = "/api/lookup/phone";
          payload = { phone: queryInput };
          addLog(`Parsing region details and checking malicious telemarketing registries for: ${queryInput}`, "info");
          break;
        case "email":
          if (!queryInput) {
            addLog("Email address is required.", "error");
            setLoading(false);
            return;
          }
          endpoint = "/api/lookup/email";
          payload = { email: queryInput };
          addLog(`Checking format validation and leak indexes for: ${queryInput}`, "info");
          break;
      }

      addLog("Awaiting response from KMSK security cluster servers...", "info");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned error code ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResult(data);
        addLog(`Lookup sequence completed successfully. Threat dossier compiled.`, "success");

        if (activeTab === "username" && data.results) {
          const foundCount = data.results.filter((r: any) => r.status === "FOUND").length;
          addLog(`Social probe result: Found ${foundCount} matches. compiling profile summary.`, "success");
        }
      } else {
        throw new Error(data.error || "Lookup sequence reported warning state.");
      }
    } catch (err: any) {
      addLog(`Failed: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill query helper
  const handleQuickDemo = (demoVal: string, tab: TabType) => {
    setActiveTab(tab);
    setInputVal(demoVal);
    addLog(`Demo query loaded: "${demoVal}" for ${tab.toUpperCase()} tool. Click SCAN below.`, "success");
  };

  // Helper to safely render simple markdown
  const renderSimpleMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      // Headers
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-emerald-400 font-bold mt-5 mb-2 text-md border-b border-emerald-500/20 pb-1">{line.replace("### ", "")}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-emerald-300 font-bold mt-6 mb-3 text-lg">{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-emerald-200 font-extrabold mt-7 mb-4 text-xl tracking-tight">{line.replace("# ", "")}</h2>;
      }
      // Lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li key={idx} className="ml-5 list-disc text-slate-300 my-1 leading-relaxed text-sm">
            {line.replace(/^[\-\*]\s+/, "")}
          </li>
        );
      }
      // Numbers
      if (/^\d+\.\s+/.test(line.trim())) {
        return (
          <div key={idx} className="ml-5 my-1 text-slate-300 leading-relaxed text-sm">
            <span className="text-emerald-400 font-semibold inline-block mr-2">{line.match(/^\d+/)?.[0]}.</span>
            {line.replace(/^\d+\.\s+/, "")}
          </div>
        );
      }
      // Strong text
      if (line.includes("**")) {
        const parts = line.split("**");
        return (
          <p key={idx} className="text-slate-300 my-2 leading-relaxed text-sm">
            {parts.map((part, pIdx) => (pIdx % 2 === 1 ? <strong key={pIdx} className="text-emerald-300 font-semibold">{part}</strong> : part))}
          </p>
        );
      }
      // Empty lines
      if (!line.trim()) return <div key={idx} className="h-2"></div>;

      return <p key={idx} className="text-slate-300 my-2 leading-relaxed text-sm">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 bg-grid-glow relative overflow-x-hidden">
      
      {/* Decorative cyber ambient glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Top Warning Banner / Real-time Status Area */}
      <div className="border-b border-emerald-500/20 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-400">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] tracking-wide text-slate-300 uppercase">
              CLUSTER STATUS: <span className="text-emerald-400 font-bold">SECURED</span> | ENCRYPTION: <span className="text-emerald-400 font-bold">AES-256</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-400 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>UTC TIME: {currentTime || "Loading..."}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>IP GATEWAY: ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero / Header Area */}
      <header className="max-w-7xl mx-auto w-full px-4 pt-8 pb-6 flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-3"
        >
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/40 shadow-lg shadow-emerald-500/5">
            <Shield className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <span className="font-mono text-xs tracking-widest text-emerald-400 uppercase font-bold border border-emerald-500/30 px-2 py-0.5 rounded bg-emerald-950/40">
            KMSK ADVANCED INTEL
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-emerald-100 to-slate-400 mb-2 font-sans"
        >
          KMSK Anonymous Lookup
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 text-sm md:text-base max-w-2xl font-sans"
        >
          Military-grade OSINT intelligence tracker & anonymous metadata analyzer. Search people handles, resolve zone profiles, and conduct live deep threat analysis safely.
        </motion.p>

        {/* Developer Credit Tag */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono tracking-wide"
        >
          <Cpu className="w-3 h-3 text-emerald-400" />
          Developed by: <span className="text-emerald-400 font-semibold font-sans">Muhammad Sadiq Developer Pvt ltd</span>
        </motion.div>
      </header>

      {/* Main Panel Grid */}
      <main className="max-w-7xl mx-auto w-full px-4 pb-16 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Navigation Tabs and Inputs (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Bento Tool List */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
            <h2 className="font-mono text-xs text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-400" /> AVAILABLE DECRYPTORS
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "ai-osint", label: "AI OSINT", icon: Search, desc: "Grounded Deep Probe" },
                { id: "domain", label: "DNS / Domain", icon: Globe, desc: "Zones & WHOIS" },
                { id: "ip", label: "IP Geolocation", icon: Shield, desc: "Block Reputation" },
                { id: "username", label: "Username Profile", icon: User, desc: "Cross-platform check" },
                { id: "phone", label: "Phone Tracker", icon: Phone, desc: "Carrier & Scam Index" },
                { id: "email", label: "Email Integrity", icon: Mail, desc: "Validation & Leaks" }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-btn-${tab.id}`}
                    onClick={() => {
                      setActiveTab(tab.id as TabType);
                      setInputVal("");
                      setResult(null);
                      addLog(`Switched active module to [${tab.label.toUpperCase()}].`, "info");
                    }}
                    className={`relative p-3.5 rounded-xl text-left border transition-all duration-200 group flex flex-col gap-1 ${
                      isSelected 
                        ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/5" 
                        : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-400 transition-colors"}`} />
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <span className="font-sans text-xs font-semibold mt-2">{tab.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400 leading-none">{tab.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Input Module */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/10 via-emerald-400/40 to-teal-500/10" />

            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                PROBE INTERFACE
              </span>
              <span className="font-mono text-[9px] text-slate-500">
                AES.PROBE_CMD_v1.4
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-200 mb-2 leading-snug">
              {getTabTitle()}
            </h3>

            <form onSubmit={triggerLookup} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-3.5 pr-10 text-sm font-sans placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors text-slate-200"
                />
                <button
                  type="button"
                  title="Clear input"
                  onClick={() => setInputVal("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors text-xs font-mono font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>RUNNING SCAN...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>INITIALIZE SCAN</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Demo Pre-fills */}
            <div className="mt-5 pt-5 border-t border-slate-800/80">
              <span className="font-mono text-[10px] text-slate-500 block mb-2.5">
                INTEL SIMULATOR DEMOS:
              </span>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleQuickDemo("mussadiqwazir86", "username")}
                  className="text-[11px] font-mono bg-slate-950 border border-slate-800/80 hover:border-emerald-500/30 hover:text-emerald-400 text-slate-400 px-2.5 py-1 rounded-md transition-all cursor-pointer"
                >
                  👤 Handle: @mussadiqwazir
                </button>
                <button 
                  onClick={() => handleQuickDemo("google.com", "domain")}
                  className="text-[11px] font-mono bg-slate-950 border border-slate-800/80 hover:border-emerald-500/30 hover:text-emerald-400 text-slate-400 px-2.5 py-1 rounded-md transition-all cursor-pointer"
                >
                  🌐 Domain: google.com
                </button>
                <button 
                  onClick={() => handleQuickDemo("8.8.8.8", "ip")}
                  className="text-[11px] font-mono bg-slate-950 border border-slate-800/80 hover:border-emerald-500/30 hover:text-emerald-400 text-slate-400 px-2.5 py-1 rounded-md transition-all cursor-pointer"
                >
                  ⚡ IP Geolocation
                </button>
              </div>
            </div>
          </div>

          {/* OPSEC Notice Box */}
          <div className="bg-emerald-950/10 border border-emerald-500/10 p-4 rounded-xl flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-400 block mb-0.5 font-sans">
                Confidentiality Notice
              </span>
              <p className="text-slate-400 leading-relaxed font-sans">
                This OSINT request is client-isolated. No lookup logs or target search history are recorded by KMSK servers or third-party networks. Security clearance: Muhammad Sadiq Developer Pvt ltd.
              </p>
            </div>
          </div>

        </div>

        {/* Right Side: Log and Intelligence Output Panels (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Active Terminal Logger (Top portion of output area) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-48 backdrop-blur-md">
            <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-[10px] text-slate-300 font-bold">KMSK-INTELLIGENCE_STREAM.log</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">
                • STREAMING
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 terminal-scroll bg-slate-950/20">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-slate-600 text-[10px] select-none shrink-0">{log.timestamp}</span>
                  <span className={`leading-relaxed ${
                    log.type === "success" ? "text-emerald-400" :
                    log.type === "error" ? "text-red-400" :
                    log.type === "warning" ? "text-yellow-400" : "text-slate-300"
                  }`}>
                    {log.type === "success" && "✔ "}
                    {log.type === "error" && "✖ "}
                    {log.type === "warning" && "⚠ "}
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Primary Intelligence Output Display */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl flex-1 flex flex-col backdrop-blur-md min-h-[400px]">
            <div className="bg-slate-950/40 px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-slate-300 font-bold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" /> OSINT INTELLIGENCE REPORT
              </span>

              {result && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-xs border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-emerald-400 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "COPIED" : "COPY REPORT"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto flex-1">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
                    <h3 className="font-mono text-sm text-emerald-400 font-bold tracking-widest uppercase mb-1">
                      Analyzing Target Signals
                    </h3>
                    <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                      Consulting neural security modules, probing cross-origin DNS and social databases, compiling target history...
                    </p>
                  </motion.div>
                ) : result ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Visual metadata dashboard */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      
                      {activeTab === "ip" && result.data && (
                        <>
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] uppercase">CITY & COUNTRY</span>
                            <span className="text-slate-200 font-sans font-semibold text-xs mt-0.5 block">
                              {result.data.city || "Unknown"}, {result.data.country_name || "Unknown"}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] uppercase">ISP / NETWORK</span>
                            <span className="text-slate-200 font-sans font-semibold text-xs mt-0.5 block truncate">
                              {result.data.org || result.data.isp || "Unknown"}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] uppercase">COORDINATES</span>
                            <span className="text-emerald-400 font-semibold text-xs mt-0.5 block">
                              {result.data.latitude || result.data.lat || "Unknown"}, {result.data.longitude || result.data.lon || "Unknown"}
                            </span>
                          </div>
                        </>
                      )}

                      {activeTab === "username" && result.results && (
                        <>
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] uppercase">CHANNELS CHECKED</span>
                            <span className="text-slate-200 font-sans font-semibold text-xs mt-0.5 block">
                              {result.results.length} Platform Nodes
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] uppercase">DETECTED ACTIVE</span>
                            <span className="text-emerald-400 font-semibold text-xs mt-0.5 block">
                              {result.results.filter((r: any) => r.status === "FOUND").length} Profiles Linked
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] uppercase">TARGET NAME</span>
                            <span className="text-slate-200 font-sans font-semibold text-xs mt-0.5 block truncate">
                              {result.username}
                            </span>
                          </div>
                        </>
                      )}

                      {activeTab === "domain" && result.dns && (
                        <>
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] uppercase">A RENDER</span>
                            <span className="text-slate-200 font-sans font-semibold text-xs mt-0.5 block truncate">
                              {result.dns.A?.[0] || "None Resolved"}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] uppercase">MX MAIL SERVER</span>
                            <span className="text-emerald-400 font-semibold text-xs mt-0.5 block truncate">
                              {result.dns.MX?.[0]?.exchange || "None"}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] uppercase">DOMAIN ZONE</span>
                            <span className="text-slate-200 font-sans font-semibold text-xs mt-0.5 block truncate">
                              {result.domain}
                            </span>
                          </div>
                        </>
                      )}

                    </div>

                    {/* Username probe details inline */}
                    {activeTab === "username" && result.results && (
                      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                        <span className="font-mono text-[10px] text-slate-500 block mb-3 uppercase tracking-wider">
                          PLATFORM PROBE INDICATORS:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {result.results.map((p: any, pIdx: number) => (
                            <div key={pIdx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-850/50 text-xs">
                              <span className="text-slate-300 font-semibold">{p.platform}</span>
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  p.status === "FOUND" ? "bg-emerald-950/80 text-emerald-400" : "bg-slate-950 text-slate-600"
                                }`}>
                                  {p.status}
                                </span>
                                {p.status === "FOUND" && (
                                  <a 
                                    href={p.profileUrl} 
                                    target="_blank" 
                                    referrerPolicy="no-referrer"
                                    rel="noreferrer" 
                                    className="text-slate-500 hover:text-emerald-400 transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grounded Web Sources citation */}
                    {result.sources && result.sources.length > 0 && (
                      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                        <span className="font-mono text-[10px] text-emerald-400 block mb-2.5 uppercase tracking-wider">
                          🌐 INVESTIGATION REFERENCE CITATIONS:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {result.sources.map((src: Source, srcIdx: number) => (
                            <a
                              key={srcIdx}
                              href={src.uri}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noreferrer"
                              className="text-xs text-slate-300 hover:text-emerald-400 flex items-center justify-between gap-3 p-2 rounded hover:bg-slate-900/50 transition-all font-mono"
                            >
                              <span className="truncate underline font-sans">{src.title}</span>
                              <span className="text-slate-500 shrink-0 text-[10px] underline flex items-center gap-1.5">
                                {src.uri.substring(0, 45)}... <ExternalLink className="w-3 h-3" />
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rendered markdown report */}
                    <div className="prose prose-invert max-w-none border-t border-slate-800/80 pt-5">
                      {renderSimpleMarkdown(result.report)}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-24 text-center h-full"
                  >
                    <div className="p-3.5 rounded-full bg-slate-950 border border-slate-800/80 text-slate-600 mb-4 animate-bounce">
                      <TerminalIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="font-sans text-sm font-bold text-slate-400 mb-1">
                      Ready for Intelligence Input
                    </h3>
                    <p className="text-slate-500 text-xs max-w-xs leading-relaxed font-sans">
                      Select a module on the left, enter details, and hit "Initialize Scan" to generate an real-time intelligence dossier.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </main>

      {/* Footer developed by Muhammad Sadiq Developer Pvt ltd */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400/50" />
            <div className="text-left font-sans">
              <span className="font-bold text-slate-400 block text-xs">
                KMSK Anonymous Intelligence Network
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">
                Cryptographic OSINT Asset v1.4.0
              </span>
            </div>
          </div>

          <div className="text-center md:text-right font-sans">
            <p className="text-slate-400">
              Developed by <span className="text-emerald-400 font-semibold">Muhammad Sadiq Developer Pvt ltd</span>
            </p>
            <p className="text-[11px] text-slate-600 font-mono mt-0.5">
              All Lookups Confidential • Local sandbox protocol in place.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
