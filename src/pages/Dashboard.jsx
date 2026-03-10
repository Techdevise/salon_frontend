import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "1.5rem",
      fontFamily: "'Inter', sans-serif",
      color: "#fff"
    }}>
      <div style={{
        fontSize: "3rem",
        background: "linear-gradient(135deg, #7c3aed, #db2777)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        fontWeight: 700
      }}>
        ✂ SalonPro
      </div>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600 }}>
        Welcome, {user.name || "User"} 👋
      </h2>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem" }}>
        Role: <strong style={{ color: "#c084fc" }}>{user.role}</strong>
      </p>
      <button
        onClick={handleLogout}
        style={{
          marginTop: "1rem",
          padding: "0.7rem 2rem",
          background: "linear-gradient(135deg, #7c3aed, #db2777)",
          border: "none",
          borderRadius: "10px",
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.95rem",
          cursor: "pointer"
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default Dashboard;
