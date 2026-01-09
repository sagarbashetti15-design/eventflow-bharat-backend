const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ================= IN-MEMORY STORAGE ================= */
const events = [];

/* ================= RAZORPAY SETUP ================= */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_XXXXXXXX",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "test_secret"
});

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.send("EventFlow Bharat Backend Running ✅");
});

/* ================= SEND PUBLIC KEY ================= */
app.get("/payment/key", (req, res) => {
  res.json({
    key: process.env.RAZORPAY_KEY_ID || "rzp_test_XXXXXXXX"
  });
});

/* ================= CREATE ORDER ================= */
app.post("/payment/order", async (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ message: "Amount required" });
  }

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
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "test_secret")
    .update(body)
    .digest("hex");

  if (expected === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

/* ================= SAVE EVENT ================= */
app.post("/events", (req, res) => {
  const { name, date, venue, email, package: pkg } = req.body;

  if (!name || !date || !venue || !email || !pkg) {
    return res.status(400).json({ message: "All fields required" });
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

  res.json({ success: true, event });
});

/* ================= ADMIN ================= */
app.get("/admin/events", (req, res) => {
  res.json(events);
});

app.get("/admin/stats", (req, res) => {
  const revenue = events.reduce((sum, e) => {
    return sum + (e.package === "Basic" ? 9999 :
                  e.package === "Premium" ? 24999 : 49999);
  }, 0);

  res.json({
    totalEvents: events.length,
    revenue
  });
});

/* ================= AI ASSISTANT ================= */
app.post("/ai/assist", (req, res) => {
  const { question } = req.body;

  const ai = {
    wedding: "Premium or Luxury is best for weddings.",
    birthday: "Basic or Premium works great for birthdays.",
    corporate: "Luxury is ideal for corporate events."
  };

  res.json({
    reply: ai[question] || "Tell me more about your event."
  });
});

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
