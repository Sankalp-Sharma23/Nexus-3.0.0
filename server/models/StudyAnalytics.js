const mongoose = require('mongoose');

const StudyAnalyticsSchema = new mongoose.Schema({
  userId:            { type: String, required: true },
  date:              { type: String, required: true }, // YYYY-MM-DD
  totalFocusMinutes: { type: Number, default: 0 },
  tasksCompleted:    { type: Number, default: 0 },
  currentStreak:     { type: Number, default: 0 },
});

StudyAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StudyAnalytics', StudyAnalyticsSchema);
