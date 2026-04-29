
const mongoose = require('mongoose');

const lcProblemSchema = new mongoose.Schema({
  id:           { type: Number, index: true },
  title:        { type: String, required: true },
  title_slug:   { type: String, required: true, unique: true },
  difficulty:   { type: String, enum: ['Easy', 'Medium', 'Hard'], index: true },
  category:     { type: String, index: true },
  tags:         [String],
  companies:    { type: [String], index: true, default: [] },
  paid_only:    { type: Boolean, default: false },
  ac_rate:      Number,
  leetcode_url: String,
}, {
  timestamps: false,
  versionKey: false,
});

module.exports = mongoose.models.LcProblem
  || mongoose.model('LcProblem', lcProblemSchema);
