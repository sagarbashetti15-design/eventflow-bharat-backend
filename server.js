const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ================= STORAGE ================= */
const events = [];

/* ================= RAZORPAY ================= */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ================= EMAIL ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ================= HEALTH ================= */
app.get("/", (req, res) => {
  res.send("EventFlow Bharat Backend Running ✅");
});

/* ================= PAYMENT KEY ================= */
app.get("/payment/key", (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});

/* ================= CREATE ORDER ================= */
app.post("/payment/order", async (req, res) => {
  const { amount } = req.body;
  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: "event_" + Date.now()
  });
  res.json(order);
});

/* ================= VERIFY PAYMENT ================= */
app.post("/payment/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expected === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

/* ================= BOOK EVENT ================= */
app.post("/events", async (req, res) => {
  const event = {
    id: events.length + 1,
    ...req.body,
    createdAt: new Date()
  };
  events.push(event);

  /* EMAIL CONFIRMATION */
  await transporter.sendMail({
    from: `"EventFlow Bharat" <${process.env.EMAIL_USER}>`,
    to: event.email,
    subject: "Your Event Booking is Confirmed 🎉",
    html: `
      <h2>Thank you for booking with EventFlow Bharat</h2>
      <p><b>Event:</b> ${event.name}</p>
      <p><b>Date:</b> ${event.date}</p>
      <p><b>Package:</b> ${event.package}</p>
      <p>Our team will contact you shortly.</p>
    `
  });

  res.json({ success: true });
});

/* ================= ADMIN ================= */
app.get("/admin/dashboard", (req, res) => {
  const revenue = events.reduce((s, e) =>
    s + (e.package === "Basic" ? 9999 : e.package === "Premium" ? 24999 : 49999),
    0
  );

  res.json({
    totalEvents: events.length,
    revenue,
    events
  });
});

/* ================= AI ================= */
app.post("/ai/assist", (req, res) => {
  const map = {
    wedding: "Luxury or Premium is best for stress-free weddings.",
    birthday: "Basic or Premium works great for birthdays.",
    corporate: "Luxury is ideal for corporate events."
  };
  res.json({ reply: map[req.body.question] || "Tell me more about your event." });
});

app.listen(PORT, () => console.log("Backend running"));
