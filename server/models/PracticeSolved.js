

const mongoose = require('mongoose');

const practiceSolvedSchema = new mongoose.Schema(
  {
    userId:   { type: String, required: true, index: true },
    slug:     { type: String, required: true },
    solvedAt: { type: Date,   default: Date.now },
  },
  { timestamps: false, versionKey: false }
);

/* Compound unique index – one entry per user per problem */
practiceSolvedSchema.index({ userId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.models.PracticeSolved
  || mongoose.model('PracticeSolved', practiceSolvedSchema);
