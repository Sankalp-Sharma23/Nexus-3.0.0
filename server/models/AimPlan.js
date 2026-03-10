const mongoose = require('mongoose');

const AimPlanSchema = new mongoose.Schema({
  userId:    { type: String, required: true, unique: true, index: true },
  plan:      { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now },
});

AimPlanSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AimPlan', AimPlanSchema);
