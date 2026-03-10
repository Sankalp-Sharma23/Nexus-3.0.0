const mongoose = require('mongoose');

const StudyEventSchema = new mongoose.Schema({
  userId:          { type: String, required: true, index: true },
  title:           { type: String, required: true },
  subject:         { type: String, default: 'General' },
  date:            { type: String, required: true },   // YYYY-MM-DD
  startTime:       { type: String, required: true },   // HH:MM  24h
  endTime:         { type: String, required: true },   // HH:MM  24h
  durationMinutes: { type: Number, default: 60 },
  type:            { type: String, enum: ['learning', 'homework', 'practice', 'revision', 'other'], default: 'learning' },
  color:           { type: String, default: '#8b5cf6' },
  aiGenerated:     { type: Boolean, default: false },
  completed:       { type: Boolean, default: false },
  linkedTaskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'StudyTask', default: null },
  createdAt:       { type: Date, default: Date.now },
});

module.exports = mongoose.model('StudyEvent', StudyEventSchema);
