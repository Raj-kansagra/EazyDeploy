import express from 'express';
import jwt from 'jsonwebtoken';
import Userdemo from '../models/Userdemo.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExist = await Userdemo.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const otp = crypto.randomInt(100000, 999999).toString(); // Generate OTP
    const otpExpires = Date.now() + 10 * 24 * 60 * 60 * 1000; // 10 days validity

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new Userdemo({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
    });

    await user.save();

    // Send OTP email
    const otpMessage = `Your verification code is ${otp}.`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your email',
      text: otpMessage,
    });

    // Send registration response with OTP token for email verification
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1y' });
    res.status(201).json({ message: 'User registered. Please check your email for OTP verification.', token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
router.post('/verify', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await Userdemo.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email' });

    if (user.otp !== otp || Date.now() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1y' });
    res.json({ message: 'Email verified successfully', token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Userdemo.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1y' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
