/**
 * routes/auth.js  –  Authentication endpoints
 *
 * POST /api/auth/register  — create account (name, email, password, gender, focus)
 * POST /api/auth/login     — email + password → JWT + user object
 * GET  /api/auth/me        — verify token, return current user
 * PUT  /api/auth/profile   — update profile fields (name, phone, location, bio, avatar)
 */

const express  = require('express');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { mongoReady, waitForMongo } = require('../db');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_change_me';
const JWT_EXPIRY = '30d'; // stay logged in for 30 days

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

const DB_ERROR = 'Database is temporarily unavailable. This is usually caused by an IP whitelist issue on MongoDB Atlas. Please add your current IP at: https://cloud.mongodb.com → Network Access.';

/* ── POST /api/auth/register ─────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  const ready = await waitForMongo(8000);
  if (!ready) return res.status(503).json({ error: DB_ERROR });

  const { name, email, password, gender, focus, focusLabel, phone, avatar } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      gender: gender || 'other',
      focus: focus || 'swe',
      focusLabel: focusLabel || null,
      phone: phone || '',
      avatar: avatar || null,
      lastLoginAt: new Date(),
    });

    const token = signToken(user._id.toString());
    res.status(201).json({
      token,
      user: {
        id: user._id.toString(), name: user.name, email: user.email,
        gender: user.gender, focus: user.focus, focusLabel: user.focusLabel,
        avatar: user.avatar, phone: user.phone, location: user.location, bio: user.bio,
      },
    });
  } catch (err) {
    console.error('[auth] register error:', err.message, err.code);
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered.' });
    if (err.message.includes('validation failed')) return res.status(400).json({ error: 'Invalid data provided.' });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/* ── POST /api/auth/login ────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  const ready = await waitForMongo(8000);
  if (!ready) return res.status(503).json({ error: DB_ERROR });

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id.toString());
    res.json({
      token,
      user: {
        id: user._id.toString(), name: user.name, email: user.email,
        gender: user.gender, focus: user.focus, focusLabel: user.focusLabel,
        avatar: user.avatar, phone: user.phone, location: user.location, bio: user.bio,
      },
    });
  } catch (err) {
    console.error('[auth] login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/* ── GET /api/auth/me ────────────────────────────────────────────────── */
router.get('/me', requireAuth, async (req, res) => {
  const ready = await waitForMongo(5000);
  if (!ready) return res.status(503).json({ error: DB_ERROR });

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      user: {
        id: user._id.toString(), name: user.name, email: user.email,
        gender: user.gender, focus: user.focus, focusLabel: user.focusLabel,
        avatar: user.avatar, phone: user.phone, location: user.location, bio: user.bio,
      },
    });
  } catch (err) {
    console.error('[auth] me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

/* ── PUT /api/auth/profile ───────────────────────────────────────────── */
router.put('/profile', requireAuth, async (req, res) => {
  const ready = await waitForMongo(5000);
  if (!ready) return res.status(503).json({ error: DB_ERROR });

  const allowedFields = ['name', 'phone', 'location', 'bio', 'avatar', 'gender', 'focus', 'focusLabel'];
  const updates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  try {
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      user: {
        id: user._id.toString(), name: user.name, email: user.email,
        gender: user.gender, focus: user.focus, focusLabel: user.focusLabel,
        avatar: user.avatar, phone: user.phone, location: user.location, bio: user.bio,
      },
    });
  } catch (err) {
    console.error('[auth] profile update error:', err.message);
    if (err.message.includes('validation failed')) return res.status(400).json({ error: 'Invalid data provided.' });
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
