/**
 * models/LcProblem.js  –  One document per LeetCode problem.
 *
 * title_slug is the natural unique key (e.g. "two-sum").
 * The collection is populated once via POST /api/practice/problems/refresh
 * and then only read at runtime — never written on every request.
 */

const mongoose = require('mongoose');

const lcProblemSchema = new mongoose.Schema({
  id:           { type: Number, index: true },
  title:        { type: String, required: true },
  title_slug:   { type: String, required: true, unique: true },
  difficulty:   { type: String, enum: ['Easy', 'Medium', 'Hard'], index: true },
  category:     { type: String, index: true },
  tags:         [String],
  paid_only:    { type: Boolean, default: false },
  ac_rate:      Number,
  leetcode_url: String,
}, {
  timestamps: false,
  versionKey: false,
});

module.exports = mongoose.models.LcProblem
  || mongoose.model('LcProblem', lcProblemSchema);
