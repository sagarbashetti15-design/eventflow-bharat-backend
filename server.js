const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = "eventflow_secret_key";

/* ===== In-memory database (REAL logic) ===== */
const users = [
  { email: "admin@eventflow.com", password: "admin123", role: "ADMIN" }
];
const events = [];

/* ===== Middleware ===== */
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
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

/* ===== Auth APIs ===== */
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(
    u => u.email === email && u.password === password
  );
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({ token, role: user.role });
});

/* ===== Events APIs ===== */
app.post("/events", (req, res) => {
  const { name, date, venue, email, package: pkg } = req.body;

  if (!name || !date || !venue || !email || !pkg) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const event = {
    id: events.length + 1,
    name,
    date,
    venue,
    email,
    package: pkg,
    createdAt: new Date()
  };

  events.push(event);

  res.json({
    success: true,
    message: "Event booked successfully",
    event
  });
});


/* ===== Admin APIs ===== */
app.get("/admin/dashboard", auth, adminOnly, (req, res) => {
  res.json({
    totalUsers: users.length,
    totalEvents: events.length,
    plans: ["Free"],
    revenue: 0
  });
});

/* ===== Health ===== */
app.get("/", (req, res) => {
  res.send("EventFlow Backend Running ✅");
});

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});


