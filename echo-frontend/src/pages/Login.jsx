import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authService } from "../services/authService.js";
import "../styles/Login.css";

const Login = () => {
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

  // ── Password Login ───────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const result = await authService.login(username, password);
      if (result.success) {
        setMessage("Login successful!");
        setTimeout(() => navigate("/chatarea"), 1500);
      }
    } catch (error) {
      setMessage(error.message || "Login failed, please try again.");
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
        setMessage("Login successful!");
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
        setMessage("Login successful!");
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
        setMessage("Login successful!");
        setTimeout(() => navigate("/chatarea"), 1500);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isSuccess = message.toLowerCase().includes("successful") || message.toLowerCase().includes("sent");

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Login</h1>
          <p>Welcome back to Echo</p>
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
          <form onSubmit={handlePasswordLogin} className="login-form">
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
              disabled={!username.trim() || !password.trim() || isLoading}
              className="auth-submit-btn"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        {/* ── Email OTP Tab ─────────────────────────────── */}
        {activeTab === "email" && (
          <form
            onSubmit={otpSent ? handleVerifyEmailOtp : handleSendEmailOtp}
            className="login-form"
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
                <p className="otp-label">Enter the 6-digit code sent to your email</p>
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
                ? "Verify & Login"
                : "Send OTP"}
            </button>
          </form>
        )}

        {/* ── Phone OTP Tab ─────────────────────────────── */}
        {activeTab === "phone" && (
          <form
            onSubmit={otpSent ? handleVerifyPhoneOtp : handleSendPhoneOtp}
            className="login-form"
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
                <p className="otp-label">Enter the 6-digit code sent to your phone</p>
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
                ? "Verify & Login"
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
            text="signin_with"
            shape="pill"
          />
        </div>

        {/* ── Toggle to Signup ──────────────────────────── */}
        <div className="toggle-auth">
          <p>
            Don't have an account?
            <a href="/signup" className="toggle-auth-btn">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
