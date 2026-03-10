/**
 * models/User.js  –  Mongoose schema for Nexus users
 *
 * Supports both local auth (email+password) and future OAuth.
 * lcStats sub-doc tracks LeetCode progress for the AIM engine.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },    password: { type: String, required: true, minlength: 6, select: false },
    gender:   { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    focus:    { type: String, default: 'swe' },           // swe | ml | data | devops | mobile | custom
    focusLabel: { type: String, default: null },           // human-readable label when focus=custom

    avatar:   { type: String, default: null },             // base64 or URL
    phone:    { type: String, default: '' },
    location: { type: String, default: '' },
    bio:      { type: String, default: '' },

    leetcodeUsername: { type: String, default: null },
    lcStats: {
      totalSolved:  { type: Number, default: 0 },
      easySolved:   { type: Number, default: 0 },
      mediumSolved: { type: Number, default: 0 },
      hardSolved:   { type: Number, default: 0 },
      lastSyncedAt: { type: Date,   default: null },
    },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* Hash password before save */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/* Compare password for login */
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/* Strip password from JSON output */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
