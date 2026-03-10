import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../redux/slices/authSlice";
import "../styles/Auth.css";

const ROLES = ["Admin", "Staff", "Receptionist"];

function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Admin",
    salonName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { confirmPassword, ...payload } = formData;
      if (payload.salonName) payload.salonName = payload.salonName.trim();
      const res = await axios.post("/api/auth/register", payload, {
        withCredentials: true,
      });
      // Use Redux instead of direct localStorage
      dispatch(loginSuccess({
        user: res.data.user,
        token: res.data.token
      }));
      setSuccess("Account created! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return null;
    if (p.length < 6) return { label: "Weak", color: "#ef4444", width: "30%" };
    if (p.length < 10) return { label: "Medium", color: "#f59e0b", width: "60%" };
    return { label: "Strong", color: "#10b981", width: "100%" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="auth-wrapper">
      {/* Left panel */}
      <div className="auth-left">
        <div className="brand">
          <div className="brand-icon">✂</div>
          <h1 className="brand-name">SalonPro</h1>
          <p className="brand-tagline">Your all-in-one salon management platform.</p>
        </div>
        <div className="decorative-circles">
          <span className="circle c1" />
          <span className="circle c2" />
          <span className="circle c3" />
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Create Account ✨</h2>
            <p>Register your salon and get started today</p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrapper">
                  <input
                    id="name"
                    type="text"
                    name="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
                {strength && (
                  <div className="password-strength">
                    <div
                      className="strength-bar"
                      style={{ width: strength.width, background: strength.color }}
                    />
                    <span style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <div className="input-wrapper select-wrapper">
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="salonName">Salon Name</label>
                <div className="input-wrapper">
                  <input
                    id="salonName"
                    type="text"
                    name="salonName"
                    placeholder="Enter Salon Name"
                    value={formData.salonName}
                    onChange={handleChange}
                    required={formData.role === "Staff" || formData.role === "Receptionist"}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <span className="spinner" /> : "Create Account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
