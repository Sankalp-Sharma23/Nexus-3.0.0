const mongoose = require('mongoose');

const StudyMaterialSchema = new mongoose.Schema({
  userId:          { type: String, required: true, index: true },
  fileName:        { type: String, required: true },
  extractedText:   { type: String, default: '' },
  aiSummary:       { type: String, default: '' },
  extractedTopics: { type: [String], default: [] },
  notes:           { type: String, default: '' },
  diagram:         { type: String, default: '' },
  quiz: {
    type: [{
      q:           String,
      options:     [String],
      answer:      String,
      explanation: String,
    }],
    default: [],
  },
  suggestedTasks: {
    type: [{
      title:              String,
      subject:            String,
      estimatedPomodoros: { type: Number, default: 2 },
    }],
    default: [],
  },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StudyMaterial', StudyMaterialSchema);
