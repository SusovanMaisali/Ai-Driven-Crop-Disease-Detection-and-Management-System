import React, { useState, useEffect } from "react";
import { apiRequest } from "../utils/api";
import { Sprout, Phone, Mail, User, ShieldAlert, Key } from "lucide-react";

export default function Auth({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  
  // Captcha State
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [captchaInput, setCaptchaInput] = useState("");
  
  // OTP Flow
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpInput, setOtpInput] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const generateCaptcha = () => {
    setNum1(Math.floor(Math.random() * 20) + 1);
    setNum2(Math.floor(Math.random() * 20) + 1);
    setCaptchaInput("");
  };

  useEffect(() => {
    generateCaptcha();
  }, [isRegister]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Captcha Check
    const expected = num1 + num2;
    if (parseInt(captchaInput.trim(), 10) !== expected) {
      setError("Incorrect CAPTCHA answer. Please try again.");
      generateCaptcha();
      return;
    }

    if (!mobile.trim()) {
      setError("Please enter a valid mobile number.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ mobile: mobile.trim() }),
      });
      setOtpCode(response.otp);
      setOtpSent(true);
      setSuccess("Simulated OTP generated successfully!");
    } catch (err) {
      setError(err.message || "Failed to log in.");
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (otpInput.trim() !== otpCode) {
      setError("Invalid OTP code. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ mobile: mobile.trim(), otp: otpInput.trim() }),
      });
      
      if (data.success) {
        onLoginSuccess(data.user, data.history);
      }
    } catch (err) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Captcha Check
    const expected = num1 + num2;
    if (parseInt(captchaInput.trim(), 10) !== expected) {
      setError("Incorrect CAPTCHA answer. Please try again.");
      generateCaptcha();
      return;
    }

    if (!name.trim() || !mobile.trim() || !email.trim()) {
      setError("All fields are required for registration.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          email: email.trim(),
        }),
      });
      setSuccess(response.message || "Registration successful! You can now log in.");
      setIsRegister(false);
      setName("");
      setEmail("");
      setCaptchaInput("");
    } catch (err) {
      setError(err.message || "Registration failed.");
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cs-void flex flex-col justify-center items-center px-4 relative overflow-hidden font-satoshi">
      {/* Glow Orbs */}
      <div className="absolute w-[500px] h-[500px] -top-40 -right-20 rounded-full bg-radial from-cs-jade/10 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute w-[400px] h-[400px] -bottom-40 -left-20 rounded-full bg-radial from-cs-lime/5 to-transparent pointer-events-none blur-3xl" />
      
      {/* Logo Head */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-3 bg-cs-deep border border-cs-border/40 px-5 py-2.5 rounded-full mb-4 shadow-glow">
          <Sprout className="w-6 h-6 text-cs-mint animate-pulse" />
          <span className="text-cs-white font-clash font-semibold text-lg tracking-wider">CropSense AI</span>
          <span className="bg-cs-emerald text-cs-lime font-bold text-xs px-2 py-0.5 rounded-full">v3.0 Pro</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-clash font-bold text-cs-white tracking-tight leading-none mb-2">
          Intelligent Crop diagnostics
        </h1>
        <p className="text-cs-muted text-sm md:text-base max-w-md mx-auto">
          Sign in to access advanced AI crop disease detection, detailed treatment plans, and farming analytics.
        </p>
      </div>

      {/* Card Wrapper */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-glow animate-fade-in">
        
        {/* Status Indicators */}
        {error && (
          <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-lg p-3 text-xs flex gap-2 items-center mb-4">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-lg p-3 text-xs mb-4">
            {success}
          </div>
        )}

        {/* OTP Flow View */}
        {otpSent ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-cs-emerald/20 border border-cs-border rounded-lg p-3 text-xs mb-4 text-cs-lime">
              <span className="font-bold">🔑 Simulated OTP Code: </span>
              <span className="font-mono text-base tracking-wider block mt-1">{otpCode}</span>
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-wider text-cs-muted mb-1">
                Enter Verification OTP
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 1234"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full bg-cs-deep border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-cs-white focus:border-cs-jade focus:outline-none transition"
                  required
                />
                <Key className="w-4 h-4 text-cs-muted absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cs-emerald to-cs-forest border border-cs-mint/30 rounded-lg py-2.5 font-semibold text-sm hover:translate-y-[-1px] hover:shadow-glow transition"
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setError("");
              }}
              className="w-full text-center text-xs text-cs-muted hover:text-cs-mint transition mt-2"
            >
              Cancel & Go Back
            </button>
          </form>
        ) : (
          /* Normal Sign-in / Create Account */
          <form onSubmit={isRegister ? handleRegister : handleSendOtp} className="space-y-4">
            <h3 className="font-clash text-xl font-semibold text-cs-white mb-2">
              {isRegister ? "📝 Register Account" : "🔑 Sign In"}
            </h3>

            {isRegister && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-cs-muted mb-1">
                  Name of Farmer
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-cs-deep border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-cs-white focus:border-cs-jade focus:outline-none transition"
                    required
                  />
                  <User className="w-4 h-4 text-cs-muted absolute left-3 top-3.5" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-cs-muted mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-cs-deep border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-cs-white focus:border-cs-jade focus:outline-none transition"
                  required
                />
                <Phone className="w-4 h-4 text-cs-muted absolute left-3 top-3.5" />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-cs-muted mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-cs-deep border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-cs-white focus:border-cs-jade focus:outline-none transition"
                    required
                  />
                  <Mail className="w-4 h-4 text-cs-muted absolute left-3 top-3.5" />
                </div>
              </div>
            )}

            {/* Captcha Input */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-cs-muted mb-1">
                CAPTCHA: What is {num1} + {num2}?
              </label>
              <input
                type="number"
                placeholder="Enter correct sum"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className="w-full bg-cs-deep border border-white/10 rounded-lg py-2.5 px-4 text-cs-white focus:border-cs-jade focus:outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cs-emerald to-cs-forest border border-cs-mint/30 rounded-lg py-2.5 font-semibold text-sm hover:translate-y-[-1px] hover:shadow-glow transition"
            >
              {loading ? "Loading..." : isRegister ? "Register & Login" : "Request OTP Code"}
            </button>

            {/* Switch Mode Links */}
            <div className="text-center text-xs text-cs-muted mt-4">
              {isRegister ? (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setError("");
                      setSuccess("");
                    }}
                    className="text-cs-mint font-bold hover:underline ml-1"
                  >
                    Sign In here
                  </button>
                </span>
              ) : (
                <span>
                  New to CropSense AI?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setError("");
                      setSuccess("");
                    }}
                    className="text-cs-mint font-bold hover:underline ml-1"
                  >
                    Create Account here
                  </button>
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
