/**
 * models/AimExperience.js  –  Community interview & placement experiences
 * shared by users on the AIM page.
 */

const mongoose = require('mongoose');

const AimExperienceSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true, index: true },
    userName:  { type: String, required: true, trim: true },

    // What role / company was targeted
    role:      { type: String, required: true, trim: true },
    company:   { type: String, default: '', trim: true },

    // The outcome
    outcome: {
      type: String,
      enum: ['offer', 'rejected', 'interviewing', 'referral'],
      required: true,
    },

    // Optional context
    duration:  { type: String, default: '' },   // e.g. "3 months"
    package:   { type: String, default: '' },   // e.g. "₹18 LPA" or "$120k"

    // The experience write-up
    title:  { type: String, required: true, trim: true, maxlength: 120 },
    story:  { type: String, required: true, trim: true, maxlength: 3000 },
    tips:   [{ type: String, trim: true, maxlength: 300 }],  // up to 5 tips

    upvotes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AimExperience ||
  mongoose.model('AimExperience', AimExperienceSchema);
