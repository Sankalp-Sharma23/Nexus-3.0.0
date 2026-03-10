const mongoose = require('mongoose');

const UserApplicationSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  company:   { type: String, required: true },
  role:      { type: String, default: '' },
  status:    { type: String, enum: ['wishlist', 'applied', 'oa', 'interview', 'offer', 'rejected'], default: 'wishlist' },
  deadline:  { type: Date,   default: null },
  url:       { type: String, default: '' },
  notes:     { type: String, default: '' },
  color:     { type: String, default: '#8b5cf6' },
  createdAt: { type: Date,   default: Date.now },
  updatedAt: { type: Date,   default: Date.now },
});

UserApplicationSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('UserApplication', UserApplicationSchema);
