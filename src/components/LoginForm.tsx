import React, { useState, useEffect, useRef } from "react";
import { LogIn, Mail, Lock, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface LoginFormProps {
  onSuccess: (token: string, user: { email: string; name: string }) => void;
  onNavigateToSignup: () => void;
}

export default function LoginForm({ onSuccess, onNavigateToSignup }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize and mount Google GSI Auth Button
  useEffect(() => {
    let mounted = true;
    
    const initGoogleAuth = () => {
      // Check if window.google is loaded (from gsi client script)
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
        try {
          const authObj = (window as any).google.accounts.id;
          authObj.initialize({
            // Put a placeholder or standard client ID. User can customize in secrets.
            client_id: "977773023496-example.apps.googleusercontent.com",
            callback: async (response: any) => {
              if (!mounted) return;
              setLoading(true);
              setError(null);
              try {
                const res = await fetch("/api/auth/google", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ credential: response.credential }),
                });
                const data = await res.json();
                if (!res.ok) {
                  throw new Error(data.message || "Failed to log in with Google");
                }
                onSuccess(data.token, data.user);
              } catch (err: any) {
                setError(err.message || "Google authentication failed");
              } finally {
                if (mounted) setLoading(false);
              }
            },
          });

          if (googleBtnRef.current) {
            authObj.renderButton(googleBtnRef.current, {
              theme: "outline",
              size: "large",
              text: "signin_with",
              width: googleBtnRef.current.offsetWidth || 340,
            });
          }
        } catch (e) {
          console.error("GSI client failed to initialize:", e);
        }
      } else {
        // Retry shortly if GSI script didn't load instantaneously
        setTimeout(initGoogleAuth, 500);
      }
    };

    initGoogleAuth();

    return () => {
      mounted = false;
    };
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Invalid credentials. Please try again.");
      }

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Simulated login helper for preview safety
  const handleSimulatedGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: "mock-google-credential" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to log in with simulated Google credentials");
      }
      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-md bg-[#0c0c0e] rounded-2xl border border-zinc-800/80 shadow-2xl p-8"
      id="login-card"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-950/50 text-indigo-400 rounded-xl mb-3 border border-indigo-500/10">
          <LogIn className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-light text-white tracking-tight">Welcome Back</h2>
        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
          Access your neural translation desk and historical logs
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-2.5 p-3.5 bg-rose-950/30 border border-rose-900/30 text-rose-400 rounded-lg text-xs mb-6"
          id="login-error-alert"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-600" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 text-sm text-zinc-200 placeholder-zinc-700 transition"
              placeholder="name@example.com"
              required
              disabled={loading}
              id="login-email-input"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Password
            </label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-600" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 text-sm text-zinc-200 placeholder-zinc-700 transition"
              placeholder="••••••••"
              required
              disabled={loading}
              id="login-password-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50 cursor-pointer"
          id="login-submit-btn"
        >
          {loading ? "Authenticating..." : "Sign In"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-zinc-800/50"></div>
        <span className="flex-shrink mx-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
          Or Continue With
        </span>
        <div className="flex-grow border-t border-zinc-800/50"></div>
      </div>

      <div className="space-y-3">
        {/* Real Google GSI SDK button target mounting */}
        <div ref={googleBtnRef} className="w-full flex justify-center h-[40px] overflow-hidden" id="google-gsi-btn-container" />

        {/* Dynamic developer simulated test button for sandbox-safety */}
        <button
          type="button"
          onClick={handleSimulatedGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 border border-zinc-800/80 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950 text-zinc-400 hover:text-zinc-200 font-medium rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          id="google-mock-btn"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          Simulate Google SSO in Preview Sandbox
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-500">
        New to Translation Portal?{" "}
        <button
          type="button"
          onClick={onNavigateToSignup}
          className="text-indigo-400 font-semibold hover:text-indigo-300 hover:underline border-none bg-transparent cursor-pointer"
          id="switch-signup-btn"
        >
          Sign up by Email
        </button>
      </p>
    </motion.div>
  );
}
