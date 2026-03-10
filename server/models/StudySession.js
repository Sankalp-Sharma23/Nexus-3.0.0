const mongoose = require('mongoose');

const StudySessionSchema = new mongoose.Schema({
  userId:          { type: String, required: true, index: true },
  taskId:          { type: mongoose.Schema.Types.ObjectId, ref: 'StudyTask', default: null },
  startTime:       { type: Date, required: true },
  endTime:         { type: Date, required: true },
  durationMinutes: { type: Number, required: true },
  sessionType:     { type: String, enum: ['focus', 'short-break', 'long-break'], default: 'focus' },
  wasCompleted:    { type: Boolean, default: true },
});

module.exports = mongoose.model('StudySession', StudySessionSchema);
