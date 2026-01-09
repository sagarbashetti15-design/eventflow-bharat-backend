const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = "eventflow_bharat_super_secret";

// ===== In-memory real storage (DB-ready) =====
const users = [
  { email: "admin@eventflowbharat.com", password: "admin123", role: "ADMIN" }
];
const events = [];

// ===== Middleware =====
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "ADMIN")
    return res.status(403).json({ message: "Admin only" });
  next();
}

// ===== Auth APIs =====
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(
    u => u.email === email && u.password === password
  );
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({ token, role: user.role });
});

// ===== Events APIs =====
app.post("/events", auth, (req, res) => {
  events.push({ ...req.body, createdBy: req.user.email });
  res.json({ message: "Event created" });
});

app.get("/events", auth, (req, res) => {
  res.json(events.filter(e => e.createdBy === req.user.email));
});

// ===== Admin APIs =====
app.get("/admin/stats", auth, adminOnly, (req, res) => {
  res.json({
    totalUsers: users.length,
    totalEvents: events.length,
    companies: 1,
    plans: ["Free"]
  });
});

// ===== Health =====
app.get("/", (req, res) => {
  res.send("EventFlow Bharat Backend Running ✅");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
app.post("/auth/register", (req, res) => {
  const { email, password, role } = req.body;
  users.push({ email, password, role: role || "USER" });
  res.json({ message: "User registered" });
});

