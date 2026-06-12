import React, { useState } from "react";
import { UserPlus, Mail, Lock, User as UserIcon, AlertCircle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

interface SignupFormProps {
  onSuccess: (token: string, user: { email: string; name: string }) => void;
  onNavigateToLogin: () => void;
}

export default function SignupForm({ onSuccess, onNavigateToLogin }: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill out all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Signup failed. Try a different email.");
      }

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during signup");
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
      id="signup-card"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-950/50 text-indigo-400 rounded-xl mb-3 border border-indigo-500/10">
          <UserPlus className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-light text-white tracking-tight">Create Account</h2>
        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
          Sign up to translate sentences and access translation logs
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-2.5 p-3.5 bg-rose-950/30 border border-rose-900/30 text-rose-400 rounded-lg text-xs mb-6"
          id="signup-error-alert"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-3.5 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 text-sm text-zinc-200 placeholder-zinc-700 transition"
              placeholder="Alex Johnson"
              required
              disabled={loading}
              id="signup-name-input"
            />
          </div>
        </div>

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
              id="signup-email-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-600" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 text-sm text-zinc-200 placeholder-zinc-700 transition"
              placeholder="•••••••• (min 6 chars)"
              required
              disabled={loading}
              id="signup-password-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-600" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-950 focus:border-indigo-500 text-sm text-zinc-200 placeholder-zinc-700 transition"
              placeholder="••••••••"
              required
              disabled={loading}
              id="signup-confirm-password-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50 mt-2 cursor-pointer"
          id="signup-submit-btn"
        >
          {loading ? "Registering..." : "Create Account"}
        </button>
      </form>

      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-zinc-800/50 font-sans"></div>
      </div>

      <button
        type="button"
        onClick={onNavigateToLogin}
        className="text-xs text-zinc-500 hover:text-zinc-200 border-none bg-transparent cursor-pointer flex items-center justify-center gap-1.5 mx-auto hover:underline"
        id="back-to-login"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Login Screen
      </button>
    </motion.div>
  );
}
