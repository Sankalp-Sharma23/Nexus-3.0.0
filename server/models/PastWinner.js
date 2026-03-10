/**
 * models/PastWinner.js  –  Mongoose schema for past hackathon winners
 *
 * Stores winning project showcases — seeded via Gemini AI generation
 * and optionally curated/approved by admins.
 */

const mongoose = require('mongoose');

const pastWinnerSchema = new mongoose.Schema(
  {
    uid:            { type: String, unique: true, required: true, index: true },
    hackathonName:  { type: String, required: true },
    projectName:    { type: String, required: true },
    teamName:       { type: String, default: 'Anonymous' },
    teamMembers:    { type: [String], default: [] },
    placement:      { type: String, default: '1st Place' },       // "1st Place", "Best AI Track", "Runner Up"
    prize:          { type: String, default: null },               // "$10,000"
    description:    { type: String, default: '' },                 // 2-3 sentence project summary
    techStack:      { type: [String], default: [] },               // ["React", "Python", "OpenAI"]
    projectUrl:     { type: String, default: '#' },                // devpost / github link
    imageUrl:       { type: String, default: null },               // project screenshot placeholder
    year:           { type: Number, default: null },
    category:       { type: String, default: 'general', index: true }, // ai | web3 | hardware | climate | data | general
    approved:       { type: Boolean, default: true, index: true },     // admin approval flag
    source:         { type: String, default: 'gemini' },               // "gemini" | "manual" | "scraped"
  },
  { timestamps: true }
);

pastWinnerSchema.index({ year: -1 });
pastWinnerSchema.index({ category: 1, year: -1 });

module.exports = mongoose.model('PastWinner', pastWinnerSchema);
