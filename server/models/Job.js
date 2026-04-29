
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    uid:         { type: String, unique: true, required: true, index: true },
    title:       { type: String, default: 'Untitled' },
    company:     { type: String, default: 'Unknown' },
    logo:        { type: String, default: null },
    location:    { type: String, default: 'Remote' },
    type:        { type: String, default: 'Full-time' },   // Full-time | Part-time | Contract | Freelance | Internship
    salary:      { type: String, default: null },
    tags:        { type: [String], default: [] },
    postedAt:    { type: Date,   default: Date.now },
    url:         { type: String, default: '#' },
    description: { type: String, default: '' },
    source:      { type: String, default: 'unknown' },     // remotive | jobicy | arbeitnow
    category:    { type: String, default: 'Engineering' },
    level:       { type: String, default: 'Mid-level' },   // Junior | Mid-level | Senior | Manager | Intern
    scrapedAt:   { type: Date,   default: Date.now, index: true },
  },
  { timestamps: true }
);

/* Compound indexes for fast filtered queries */
jobSchema.index({ postedAt: -1 });
jobSchema.index({ type: 1 });
jobSchema.index({ level: 1 });
jobSchema.index({ source: 1 });
/* Text index for keyword search */
jobSchema.index({ title: 'text', company: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.models.Job || mongoose.model('Job', jobSchema);
