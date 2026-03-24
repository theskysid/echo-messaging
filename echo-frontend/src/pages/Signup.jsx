import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authService } from "../services/authService.js";
import "../styles/Signup.css";

const Signup = () => {
  const [activeTab, setActiveTab] = useState("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const resetFields = useCallback(() => {
    setMessage("");
    setOtp("");
    setOtpSent(false);
    setCountdown(0);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetFields();
    setUsername("");
    setPassword("");
    setEmail("");
    setPhone("");
  };

  // ── Password Signup ──────────────────────────────────────
  const handlePasswordSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const result = await authService.signup(username, email, password);
      if (result.success) {
        setMessage("Account created successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (error) {
      setMessage(error.message || "Signup failed, please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Email OTP ────────────────────────────────────────────
  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      await authService.sendEmailOtp(email);
      setOtpSent(true);
      setCountdown(60);
      setMessage("OTP sent to your email!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const result = await authService.verifyEmailOtp(email, otp);
      if (result.success) {
        setMessage("Account created! Redirecting...");
        setTimeout(() => navigate("/chatarea"), 1500);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Phone OTP ────────────────────────────────────────────
  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      await authService.sendPhoneOtp(phone);
      setOtpSent(true);
      setCountdown(60);
      setMessage("OTP sent to your phone!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const result = await authService.verifyPhoneOtp(phone, otp);
      if (result.success) {
        setMessage("Account created! Redirecting...");
        setTimeout(() => navigate("/chatarea"), 1500);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google OAuth ─────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setMessage("");
    setIsLoading(true);
    try {
      const result = await authService.googleLogin(
        credentialResponse.credential
      );
      if (result.success) {
        setMessage("Account created! Redirecting...");
        setTimeout(() => navigate("/chatarea"), 1500);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isSuccess =
    message.toLowerCase().includes("successfully") ||
    message.toLowerCase().includes("created") ||
    message.toLowerCase().includes("sent");

  return (
    <div className="signup-container">
      <div className="signup-box">
        <div className="signup-header">
          <h1>Sign Up</h1>
          <p>Create an account to start chatting</p>
        </div>

        {/* ── Auth Tabs ─────────────────────────────────── */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === "password" ? "active" : ""}`}
            onClick={() => handleTabChange("password")}
          >
            🔒 Password
          </button>
          <button
            className={`auth-tab ${activeTab === "email" ? "active" : ""}`}
            onClick={() => handleTabChange("email")}
          >
            ✉️ Email OTP
          </button>
          <button
            className={`auth-tab ${activeTab === "phone" ? "active" : ""}`}
            onClick={() => handleTabChange("phone")}
          >
            📱 Phone OTP
          </button>
        </div>

        {/* ── Password Tab ──────────────────────────────── */}
        {activeTab === "password" && (
          <form onSubmit={handlePasswordSignup} className="signup-form">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              maxLength={20}
              required
              disabled={isLoading}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              maxLength={20}
              required
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={
                !username.trim() ||
                !email.trim() ||
                !password.trim() ||
                isLoading
              }
              className="auth-submit-btn"
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>
        )}

        {/* ── Email OTP Tab ─────────────────────────────── */}
        {activeTab === "email" && (
          <form
            onSubmit={otpSent ? handleVerifyEmailOtp : handleSendEmailOtp}
            className="signup-form"
          >
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
              disabled={isLoading || otpSent}
            />
            {otpSent && (
              <div className="otp-section">
                <p className="otp-label">
                  Enter the 6-digit code sent to your email
                </p>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="auth-input otp-input"
                  maxLength={6}
                  required
                  disabled={isLoading}
                  autoFocus
                />
                {countdown > 0 ? (
                  <p className="otp-countdown">
                    Resend OTP in <span>{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={handleSendEmailOtp}
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={
                otpSent
                  ? otp.length !== 6 || isLoading
                  : !email.trim() || isLoading
              }
              className="auth-submit-btn"
            >
              {isLoading
                ? "Please wait..."
                : otpSent
                ? "Verify & Sign Up"
                : "Send OTP"}
            </button>
          </form>
        )}

        {/* ── Phone OTP Tab ─────────────────────────────── */}
        {activeTab === "phone" && (
          <form
            onSubmit={otpSent ? handleVerifyPhoneOtp : handleSendPhoneOtp}
            className="signup-form"
          >
            <input
              type="tel"
              placeholder="Phone number (e.g. +91XXXXXXXXXX)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="auth-input"
              required
              disabled={isLoading || otpSent}
            />
            {otpSent && (
              <div className="otp-section">
                <p className="otp-label">
                  Enter the 6-digit code sent to your phone
                </p>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="auth-input otp-input"
                  maxLength={6}
                  required
                  disabled={isLoading}
                  autoFocus
                />
                {countdown > 0 ? (
                  <p className="otp-countdown">
                    Resend OTP in <span>{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={handleSendPhoneOtp}
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={
                otpSent
                  ? otp.length !== 6 || isLoading
                  : !phone.trim() || isLoading
              }
              className="auth-submit-btn"
            >
              {isLoading
                ? "Please wait..."
                : otpSent
                ? "Verify & Sign Up"
                : "Send OTP"}
            </button>
          </form>
        )}

        {/* ── Message ───────────────────────────────────── */}
        {message && (
          <p
            className="auth-message"
            style={{ color: isSuccess ? "#4CAF50" : "#ff6b6b" }}
          >
            {message}
          </p>
        )}

        {/* ── Divider ───────────────────────────────────── */}
        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* ── Google Sign-In ────────────────────────────── */}
        <div className="google-btn-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setMessage("Google sign-in failed")}
            theme="outline"
            size="large"
            width="100%"
            text="signup_with"
            shape="pill"
          />
        </div>

        {/* ── Toggle to Login ──────────────────────────── */}
        <div className="toggle-auth">
          <p>
            Already have an account?
            <a href="/login" className="toggle-auth-btn">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
