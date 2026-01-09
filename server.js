require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Razorpay = require("razorpay");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const twilio = require("twilio");

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

/* ---------- DB ---------- */
const db = new Pool({ connectionString: process.env.DATABASE_URL });

/* ---------- Razorpay ---------- */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ---------- Email ---------- */
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

/* ---------- WhatsApp ---------- */
const whatsapp = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

/* ---------- Auth Middleware ---------- */
const auth = (role) => (req,res,next)=>{
  try{
    const token=req.headers.authorization.split(" ")[1];
    const data=jwt.verify(token,process.env.JWT_SECRET);
    if(role && data.role!==role) return res.sendStatus(403);
    req.user=data; next();
  }catch{res.sendStatus(401)}
};

/* ---------- Login ---------- */
app.post("/login", async(req,res)=>{
  const {email,password}=req.body;
  const {rows}=await db.query("SELECT * FROM users WHERE email=$1",[email]);
  if(!rows[0]||!bcrypt.compareSync(password,rows[0].password))
    return res.status(401).json({error:"Invalid"});
  const token=jwt.sign({id:rows[0].id,role:rows[0].role},process.env.JWT_SECRET);
  res.json({token,role:rows[0].role});
});

/* ---------- Events ---------- */
app.get("/events", async(req,res)=>{
  const {rows}=await db.query("SELECT * FROM events WHERE approved=true");
  res.json(rows);
});

app.post("/events", auth("organizer"), async(req,res)=>{
  const e=req.body;
  await db.query(
    `INSERT INTO events(title_ka,title_en,city,price,organizer_id)
     VALUES($1,$2,$3,$4,$5)`,
    [e.title_ka,e.title_en,e.city,e.price,req.user.id]
  );
  res.json({success:true});
});

/* ---------- Admin ---------- */
app.get("/admin/events", auth("admin"), async(req,res)=>{
  const {rows}=await db.query("SELECT * FROM events");
  res.json(rows);
});

app.post("/admin/approve/:id", auth("admin"), async(req,res)=>{
  await db.query("UPDATE events SET approved=true WHERE id=$1",[req.params.id]);
  res.json({success:true});
});

/* ---------- Payment ---------- */
app.get("/payment/key",(req,res)=>res.json({key:process.env.RAZORPAY_KEY_ID}));

app.post("/payment/order", async(req,res)=>{
  const order=await razorpay.orders.create({
    amount:req.body.amount*100,currency:"INR"
  });
  res.json(order);
});

/* ---------- Booking ---------- */
app.post("/book", async(req,res)=>{
  const {event_id,email,phone}=req.body;
  await db.query(
    "INSERT INTO bookings(event_id,email) VALUES($1,$2)",
    [event_id,email]
  );

  await mailer.sendMail({
    to:email,
    subject:"Event Booking Confirmed",
    text:"Your booking is confirmed"
  });

  await whatsapp.messages.create({
    from:"whatsapp:+14155238886",
    to:`whatsapp:${phone}`,
    body:"Your EventFlow Bharat booking is confirmed 🎉"
  });

  res.json({success:true});
});

app.listen(3000,()=>console.log("EventFlow Bharat Backend LIVE"));

