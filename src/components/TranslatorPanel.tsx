import React, { useState, useEffect } from "react";
import { 
  Languages, 
  ArrowLeftRight, 
  Copy, 
  Check, 
  Trash2, 
  LogOut, 
  History, 
  Search, 
  Sparkles, 
  AlertCircle, 
  Globe, 
  RefreshCw, 
  Clock,
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TranslationRecord, LanguageCode, Language } from "../types";

interface TranslatorPanelProps {
  token: string;
  user: { email: string; name: string };
  onLogout: () => void;
}

const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "bn", name: "Bangla", nativeName: "বাংলা", flag: "🇧🇩" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
];

export default function TranslatorPanel({ token, user, onLogout }: TranslatorPanelProps) {
  const [text, setText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState<LanguageCode>("en");
  const [targetLang, setTargetLang] = useState<LanguageCode>("es");
  const [translating, setTranslating] = useState(false);
  const [history, setHistory] = useState<TranslationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"workspace" | "history">("workspace");

  // Load history on mount and upon translations
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error("Failed to fetch history.", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  // Handle Translate execution
  const handleTranslate = async () => {
    if (!text.trim()) return;
    setTranslating(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, sourceLang, targetLang }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to carry out translation.");
      }

      setTranslatedText(data.translatedText);
      fetchHistory(); // refresh history list
    } catch (err: any) {
      setError(err.message || "An error occurred during translation.");
    } finally {
      setTranslating(false);
    }
  };

  // Swap source and target languages helper
  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prevSource);
    
    // Swap texts as well to support smooth conversational workflows
    if (translatedText) {
      setText(translatedText);
      setTranslatedText(text);
    }
  };

  // Clipboard copy helper
  const handleCopy = (textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Delete individual history item
  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  // Clear translation history globally
  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your entire translation history? This cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHistory([]);
      }
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  // Search filtered translation records
  const filteredHistory = history.filter((item) => {
    const query = searchQuery.toLowerCase();
    const sourceLanguage = LANGUAGES.find((l) => l.code === item.sourceLang)?.name.toLowerCase() || "";
    const targetLanguage = LANGUAGES.find((l) => l.code === item.targetLang)?.name.toLowerCase() || "";
    
    return (
      item.originalText.toLowerCase().includes(query) ||
      item.translatedText.toLowerCase().includes(query) ||
      sourceLanguage.includes(query) ||
      targetLanguage.includes(query)
    );
  });

  const sourceLangDetails = LANGUAGES.find((l) => l.code === sourceLang);
  const targetLangDetails = LANGUAGES.find((l) => l.code === targetLang);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6" id="translator-workspace">
      {/* Top Header Card */}
      <header className="bg-[#0c0c0e]/80 backdrop-blur-md rounded-2xl border border-zinc-800/50 p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/50 text-indigo-400 rounded-xl border border-indigo-500/10">
            <Languages className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-light text-white tracking-tight flex items-center gap-1.5">
              Glossa <span className="text-zinc-500 italic">Translator</span> <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-450 rounded-full border border-indigo-500/20">Gemini Fast</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5" id="user-display-badge">
              Active Session: <span className="text-zinc-300 font-semibold">{user.name}</span> <span className="text-zinc-800">|</span> <span className="text-zinc-400 font-medium">{user.email}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Internal Navigation Tabs inside the Panel */}
          <div className="bg-zinc-900 border border-zinc-800/30 p-1 rounded-xl flex text-xs font-semibold">
            <button
              onClick={() => setActiveTab("workspace")}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === "workspace"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              id="tab-btn-workspace"
            >
              Translate
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 rounded-lg transition relative flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              id="tab-btn-history"
            >
              History
              {history.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] bg-indigo-600 text-white rounded-full font-bold">
                  {history.length}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-rose-450 hover:bg-rose-950/30 rounded-xl transition border border-transparent hover:border-rose-900/10 bg-transparent cursor-pointer"
            title="Log Out"
            id="workspace-logout-btn"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container Views with dynamic Tab state */}
      <AnimatePresence mode="wait">
        {activeTab === "workspace" ? (
          <motion.div
            key="workspace-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {error && (
              <div className="flex items-start gap-2.5 p-4 bg-rose-950/20 border border-rose-900/30 text-rose-400 rounded-xl text-sm animate-shake" id="translate-error-alert">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <div className="space-y-1">
                  <p className="font-semibold">Translation Service Notice</p>
                  <p className="text-xs text-rose-300/90 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Translation Workbench */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              
              {/* Left Column: Input Panel */}
              <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col h-full group transition-all hover:border-zinc-700/50" id="source-translator-card">
                {/* Header Selector bar */}
                <div className="px-5 py-4 bg-zinc-950/40 border-b border-zinc-800/50 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Source Language</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{sourceLangDetails?.flag}</span>
                    <select
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value as LanguageCode)}
                      className="bg-transparent text-sm font-semibold text-zinc-100 focus:outline-none cursor-pointer py-1 pr-1 border-b border-dashed border-zinc-700 hover:border-zinc-300"
                      id="source-language-select"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-[#0c0c0e] text-zinc-200">
                          {lang.name} ({lang.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Textarea Area */}
                <div className="relative p-5 flex-grow min-h-[220px] flex flex-col pt-8">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type words, sentences, or paragraphs here..."
                    className="w-full h-full resize-none flex-grow bg-transparent focus:ring-0 text-2xl font-light text-zinc-100 placeholder-zinc-800 focus:outline-none leading-relaxed"
                    maxLength={1500}
                    disabled={translating}
                    id="translate-input-textarea"
                  />
                  
                  {/* Footer controls inside textarea */}
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/30 pt-3">
                    <span className={`${text.length >= 1400 ? "text-amber-500 font-medium" : ""}`}>
                      {text.length} / 1500 characters
                    </span>
                    {text && (
                      <button
                        onClick={() => { setText(""); setTranslatedText(""); }}
                        className="text-zinc-400 hover:text-zinc-200 font-semibold border-none bg-transparent cursor-pointer"
                        disabled={translating}
                        id="clear-input-btn"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle dynamic swap overlay for absolute beauty */}
              <div className="lg:hidden flex items-center justify-center py-2">
                <button
                  type="button"
                  onClick={handleSwapLanguages}
                  className="w-10 h-10 bg-[#0c0c0e] border border-zinc-800/80 rounded-full flex items-center justify-center shadow hover:shadow-indigo-500/5 hover:bg-zinc-900 transition-all text-zinc-400 hover:text-zinc-200 hover:scale-105 active:scale-95 cursor-pointer"
                  title="Swap languages"
                  id="mobile-swap-languages-btn"
                >
                  <ArrowLeftRight className="w-4 h-4 rotate-90" />
                </button>
              </div>

              {/* Right Column: Output Panel */}
              <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-2xl overflow-hidden flex flex-col h-full" id="target-translator-card">
                {/* Header Selector bar */}
                <div className="px-5 py-4 bg-indigo-950/20 border-b border-indigo-500/10 flex items-center justify-between">
                  <span className="text-[10px] text-indigo-400/60 font-bold uppercase tracking-widest">Target Result</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{targetLangDetails?.flag}</span>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
                      className="bg-transparent text-sm font-semibold text-zinc-100 focus:outline-none cursor-pointer py-1 pr-1 border-b border-dashed border-indigo-500/40 hover:border-indigo-400"
                      id="target-language-select"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-[#0c0c0e] text-zinc-200">
                          {lang.name} ({lang.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Response area */}
                <div className="p-5 flex-grow min-h-[220px] flex flex-col justify-between pt-8 bg-indigo-950/5">
                  <div className="flex-grow">
                    {translating ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3" id="translation-loading-indicator">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                        <span className="text-xs text-indigo-400/85 font-medium tracking-wide">AI Engine Translating...</span>
                      </div>
                    ) : translatedText ? (
                      <p className="text-white text-2xl font-light leading-relaxed whitespace-pre-wrap font-sans" id="translate-result-paragraph">
                        {translatedText}
                      </p>
                    ) : (
                      <div className="py-12 text-center text-zinc-700 italic text-sm font-light">
                        Translated outcome will be generated instantly here...
                      </div>
                    )}
                  </div>

                  {translatedText && !translating && (
                    <div className="mt-4 flex items-center justify-between border-t border-indigo-500/15 pt-3">
                      <div className="flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">Neural Accuracy 99%</span>
                      </div>
                      <button
                        onClick={() => handleCopy(translatedText)}
                        className="text-xs hover:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/60 transition flex items-center gap-1.5 cursor-pointer text-zinc-400 hover:text-white active:scale-95"
                        id="copy-translation-btn"
                      >
                        {copySuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-450 font-bold" />
                            <span className="text-emerald-400 font-semibold font-sans">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy translation</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Desktop Center swap actions and Translate Button row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
              <button
                type="button"
                onClick={handleSwapLanguages}
                className="hidden lg:flex w-11 h-11 bg-[#0c0c0e] border border-zinc-800/80 rounded-full items-center justify-center shadow-lg hover:shadow-indigo-500/5 hover:bg-zinc-900 transition-all text-zinc-400 hover:text-zinc-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                title="Swap source & destination languages"
                id="desktop-swap-languages-btn"
              >
                <ArrowLeftRight className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={handleTranslate}
                disabled={translating || !text.trim()}
                className="w-full sm:w-auto px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold shadow-2xl shadow-indigo-500/20 transition-all active:scale-95 duration-150 cursor-pointer"
                id="execute-translation-btn"
              >
                {translating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Languages className="w-5 h-5" />
                    <span>Translate Now</span>
                  </>
                )}
              </button>
            </div>

            {/* Micro History preview on Workspace for elegant craft */}
            {history.length > 0 && (
              <div className="pt-6" id="workspace-history-preview">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Recent Translations
                  </h3>
                  <button
                    onClick={() => setActiveTab("history")}
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-semibold flex items-center gap-0.5 border-none bg-transparent cursor-pointer"
                  >
                    View All History
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.slice(0, 3).map((item) => {
                    const fromLang = LANGUAGES.find((l) => l.code === item.sourceLang);
                    const toLang = LANGUAGES.find((l) => l.code === item.targetLang);
                    return (
                      <div
                        key={item.id}
                        className="bg-[#0c0c0e] p-5 rounded-xl border border-zinc-800/80 shadow-md hover:border-zinc-700/50 hover:shadow-lg transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-2">
                            <span>{fromLang?.flag} {fromLang?.name}</span>
                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                            <span>{toLang?.flag} {toLang?.name}</span>
                          </div>
                          <p className="text-xs text-zinc-200 line-clamp-2 font-medium mb-1.5 leading-relaxed">
                            "{item.originalText}"
                          </p>
                          <p className="text-xs text-indigo-400 line-clamp-2 italic leading-relaxed">
                            {item.translatedText}
                          </p>
                        </div>
                        <div className="flex justify-end gap-1.5 mt-3 pt-2 border-t border-zinc-800/30">
                          <button
                            onClick={() => {
                              setText(item.originalText);
                              setTranslatedText(item.translatedText);
                              setSourceLang(item.sourceLang as LanguageCode);
                              setTargetLang(item.targetLang as LanguageCode);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="text-[10px] text-zinc-400 hover:text-white font-bold bg-[#141417] hover:bg-zinc-800 px-2.5 py-1 rounded transition border border-zinc-800/50 cursor-pointer"
                          >
                            Reuse
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Search and control bar */}
            <div className="bg-[#0c0c0e] rounded-2xl border border-zinc-800/80 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-zinc-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query translations or languages..."
                  className="w-full pl-9.5 pr-4 py-2 border border-zinc-800/80 rounded-lg text-sm bg-zinc-900/40 text-zinc-200 focus:bg-[#141417] focus:outline-none focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 transition placeholder-zinc-700"
                  id="history-search-input"
                />
              </div>

              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="w-full md:w-auto px-4 py-2 text-rose-400 hover:bg-rose-950/20 border border-rose-900/30 rounded-lg text-xs font-semibold select-none flex items-center justify-center gap-1.5 transition cursor-pointer"
                  id="clear-all-history-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Entire History
                </button>
              )}
            </div>

            {/* List and Grid */}
            {filteredHistory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="history-grid">
                {filteredHistory.map((item) => {
                  const fromLang = LANGUAGES.find((l) => l.code === item.sourceLang);
                  const toLang = LANGUAGES.find((l) => l.code === item.targetLang);

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={item.id}
                      className="bg-[#0c0c0e] p-5 rounded-2xl border border-zinc-800/80 shadow-md hover:border-zinc-700/50 transition-all group flex flex-col justify-between relative"
                    >
                      <div>
                        {/* Tags */}
                        <div className="flex items-center justify-between mb-3 border-b border-zinc-800/30 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                            <span>{fromLang?.flag} {fromLang?.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
                            <span>{toLang?.flag} {toLang?.name}</span>
                          </div>
                          
                          <button
                            onClick={(e) => handleDeleteItem(item.id, e)}
                            className="p-1 text-zinc-600 hover:text-rose-400 rounded bg-transparent border-none opacity-0 group-hover:opacity-100 focus:opacity-100 transition cursor-pointer"
                            title="Delete entry"
                            id={`delete-history-${item.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Content text */}
                        <div className="space-y-3">
                          <div>
                            <span className="block text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-0.5">Original</span>
                            <p className="text-sm text-zinc-200 font-medium">"{item.originalText}"</p>
                          </div>
                          <div>
                            <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-0.5">Translation</span>
                            <p className="text-sm text-indigo-400 italic font-medium whitespace-pre-wrap">{item.translatedText}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-zinc-800/30 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-600">
                          {new Date(item.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopy(item.translatedText)}
                            className="px-2.5 py-1 text-[10px] font-semibold border border-zinc-800/80 rounded bg-zinc-900/60 hover:bg-zinc-800 hover:text-zinc-100 transition text-zinc-400 cursor-pointer"
                          >
                            Copy Output
                          </button>
                          <button
                            onClick={() => {
                              setText(item.originalText);
                              setTranslatedText(item.translatedText);
                              setSourceLang(item.sourceLang as LanguageCode);
                              setTargetLang(item.targetLang as LanguageCode);
                              setActiveTab("workspace");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="px-2.5 py-1 text-[10px] font-semibold bg-indigo-950/40 border border-indigo-550/20 text-indigo-400 hover:bg-indigo-900/60 transition rounded cursor-pointer animate-fade-in"
                          >
                            Reuse Translation
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#0c0c0e] rounded-2xl border border-zinc-800/80 p-12 text-center text-zinc-500" id="empty-history-alert">
                <History className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-300 font-semibold mb-1">No log entries found</p>
                <p className="text-xs text-zinc-600">
                  {searchQuery ? "No matches found for your search query." : "Translate a word or sentence to populate entries."}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-12 text-center text-[10px] text-zinc-650 font-sans tracking-widest uppercase">
        Multilingual Translation Portal • Powered by Google Gemini 3.5 Flash Build
      </footer>
    </div>
  );
}
