import { useState, useEffect } from "react";
import { User, AuthState } from "./types";
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import TranslatorPanel from "./components/TranslatorPanel";
import { Sparkles, Globe, Shield, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  const [view, setView] = useState<"login" | "signup">("login");

  // Validate cache on initial mount
  useEffect(() => {
    const checkActiveSession = async () => {
      const savedToken = localStorage.getItem("auth_token");
      if (!savedToken) {
        setAuthState({ user: null, token: null, loading: false });
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAuthState({
            user: data.user,
            token: savedToken,
            loading: false,
          });
        } else {
          // Token is stale or invalid; clear cache
          localStorage.removeItem("auth_token");
          setAuthState({ user: null, token: null, loading: false });
        }
      } catch (e) {
        console.error("Session check fell behind. Reverting to cached state or offline clearance.", e);
        // Fallback to local storage state if server is momentarily unreachable
        const savedUserStr = localStorage.getItem("auth_user");
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            setAuthState({
              user: savedUser,
              token: savedToken,
              loading: false,
            });
            return;
          } catch (_) {}
        }
        setAuthState({ user: null, token: null, loading: false });
      }
    };

    checkActiveSession();
  }, []);

  const handleAuthSuccess = (token: string, user: User) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    setAuthState({
      user,
      token,
      loading: false,
    });
  };

  const handleLogout = async () => {
    const currentToken = authState.token;
    
    // Optimistic reset
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setAuthState({
      user: null,
      token: null,
      loading: false,
    });
    setView("login");

    if (currentToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch (e) {
        console.error("Server logout request was unsuccessful.", e);
      }
    }
  };

  if (authState.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#08080a] p-6" id="app-loading-screen">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 360, 360],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            repeat: Infinity,
          }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full flex items-center justify-center mb-4"
        />
        <span className="text-sm text-zinc-400 font-semibold tracking-wide animate-pulse">Initializing Portal Security...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-300 flex flex-col justify-between font-sans" id="app-root-container">
      {/* Top micro security indicator banner */}
      <div className="w-full bg-[#0c0c0e]/80 backdrop-blur-md border-b border-zinc-800/50 py-2.5 px-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm">
        <Shield className="w-3.5 h-3.5 text-indigo-500" />
        <span>End-to-End Encrypted Session Service</span>
      </div>

      <main className="flex-grow flex items-center justify-center py-10">
        <AnimatePresence mode="wait">
          {!authState.token ? (
            <div className="w-full flex justify-center px-4" key="auth-screen">
              {view === "login" ? (
                <LoginForm
                  onSuccess={handleAuthSuccess}
                  onNavigateToSignup={() => setView("signup")}
                />
              ) : (
                <SignupForm
                  onSuccess={handleAuthSuccess}
                  onNavigateToLogin={() => setView("login")}
                />
              )}
            </div>
          ) : (
            <div className="w-full" key="portal-panel">
              <TranslatorPanel
                token={authState.token}
                user={authState.user!}
                onLogout={handleLogout}
              />
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Brand trademark footer (understated and highly polished) */}
      <footer className="w-full py-4 text-center border-t border-zinc-800/30 bg-[#060608] text-[10px] text-zinc-600 tracking-wider flex items-center justify-center gap-3">
        <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-indigo-500" /> Secure Auth Engine</span>
        <span className="text-zinc-800">•</span>
        <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-indigo-500" /> 5 Unified Languages</span>
      </footer>
    </div>
  );
}
