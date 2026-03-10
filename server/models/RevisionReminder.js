const mongoose = require('mongoose');

const RevisionReminderSchema = new mongoose.Schema({
  userId:               { type: String, required: true, index: true },
  taskId:               { type: mongoose.Schema.Types.ObjectId, ref: 'StudyTask', required: true },
  title:                { type: String, required: true },
  subject:              { type: String, default: 'General' },
  originalCompletedAt:  { type: Date, required: true },
  dueAt:                { type: Date, required: true, index: true },
  interval:             { type: Number, enum: [1, 3, 7, 14], required: true },
  status:               { type: String, enum: ['pending', 'done', 'dismissed'], default: 'pending' },
  iteration:            { type: Number, min: 1, max: 4, required: true },
  createdAt:            { type: Date, default: Date.now },
});

module.exports = mongoose.model('RevisionReminder', RevisionReminderSchema);
