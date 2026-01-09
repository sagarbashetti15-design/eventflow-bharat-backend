const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const sqlite3 = require("sqlite3").verbose();
const twilio = require("twilio");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- DB ---------- */
const db = new sqlite3.Database("database.db");
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    city TEXT,
    price INTEGER
  )`);
});

/* ---------- Razorpay ---------- */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ---------- WhatsApp ---------- */
const whatsapp = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

/* ---------- Health ---------- */
app.get("/", (_, res) => res.send("EventFlow Backend Running"));

/* ---------- Events ---------- */
app.get("/events", (_, res) => {
  db.all("SELECT * FROM events", (e, rows) => res.json(rows));
});

app.post("/events", (req, res) => {
  const { title, city, price } = req.body;
  db.run(
    "INSERT INTO events(title,city,price) VALUES(?,?,?)",
    [title, city, price],
    () => res.json({ success: true })
  );
});

/* ---------- Payment ---------- */
app.get("/payment/key", (_, res) =>
  res.json({ key: process.env.RAZORPAY_KEY_ID })
);

app.post("/payment/order", async (req, res) => {
  const order = await razorpay.orders.create({
    amount: req.body.amount * 100,
    currency: "INR"
  });
  res.json(order);
});

/* ---------- Booking ---------- */
app.post("/book", async (req, res) => {
  const { phone } = req.body;

  await whatsapp.messages.create({
    from: "whatsapp:+14155238886",
    to: "whatsapp:" + phone,
    body: "🎉 EventFlow Bharat: Booking confirmed!"
  });

  res.json({ success: true });
});

app.listen(3000, () => console.log("Backend LIVE on 3000"));
