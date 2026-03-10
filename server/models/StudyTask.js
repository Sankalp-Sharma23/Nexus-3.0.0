const mongoose = require('mongoose');

const StudyTaskSchema = new mongoose.Schema({
  userId:             { type: String, required: true, index: true },
  title:              { type: String, required: true },
  subject:            { type: String, default: 'General' },
  dueDate:            { type: Date,   default: null },
  status:             { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  priority:           { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  estimatedPomodoros: { type: Number, default: 1 },
  actualPomodoros:    { type: Number, default: 0 },
  type:               { type: String, enum: ['learning', 'homework', 'practice', 'revision', 'other'], default: 'learning' },
  fromAI:             { type: Boolean, default: false },
  materialId:         { type: mongoose.Schema.Types.ObjectId, ref: 'StudyMaterial', default: null },
  createdAt:          { type: Date, default: Date.now },
});

module.exports = mongoose.model('StudyTask', StudyTaskSchema);
