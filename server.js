const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Razorpay = require("razorpay");
const db = require("./db");
const mailer = require("./mailer");
const { auth } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ---------- AUTH ---------- */
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await db.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );
  if (!rows[0] || !bcrypt.compareSync(password, rows[0].password))
    return res.status(401).json({ error: "Invalid" });

  const token = jwt.sign(
    { id: rows[0].id, role: rows[0].role },
    process.env.JWT_SECRET
  );
  res.json({ token, role: rows[0].role });
});

/* ---------- EVENTS ---------- */
app.get("/events", async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM events WHERE approved=true"
  );
  res.json(rows);
});

app.get("/events/:id", async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM events WHERE id=$1",
    [req.params.id]
  );
  res.json(rows[0]);
});

app.post("/events", auth("organizer"), async (req, res) => {
  const e = req.body;
  await db.query(
    `INSERT INTO events
    (title_ka,title_en,city,price,description,organizer_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [e.title_ka, e.title_en, e.city, e.price, e.description, req.user.id]
  );
  res.json({ success: true });
});

/* ---------- ADMIN ---------- */
app.get("/admin/events", auth("admin"), async (req, res) => {
  const { rows } = await db.query("SELECT * FROM events");
  res.json(rows);
});

app.post("/admin/approve/:id", auth("admin"), async (req, res) => {
  await db.query("UPDATE events SET approved=true WHERE id=$1", [
    req.params.id
  ]);
  res.json({ success: true });
});

/* ---------- PAYMENT ---------- */
app.get("/payment/key", (req, res) =>
  res.json({ key: process.env.RAZORPAY_KEY_ID })
);

app.post("/payment/order", async (req, res) => {
  const order = await razorpay.orders.create({
    amount: req.body.amount * 100,
    currency: "INR"
  });
  res.json(order);
});

/* ---------- BOOKING ---------- */
app.post("/book", async (req, res) => {
  const b = req.body;
  await db.query(
    "INSERT INTO bookings(event_id,email) VALUES($1,$2)",
    [b.event_id, b.email]
  );

  await mailer.sendMail({
    to: b.email,
    subject: "Event Booking Confirmed",
    text: "Your booking is confirmed."
  });

  res.json({ success: true });
});

/* ---------- HISTORY ---------- */
app.get("/bookings/:email", async (req, res) => {
  const { rows } = await db.query(
    `SELECT e.title_en,e.city
     FROM bookings b JOIN events e ON e.id=b.event_id
     WHERE b.email=$1`,
    [req.params.email]
  );
  res.json(rows);
});

app.listen(process.env.PORT || 3000);
