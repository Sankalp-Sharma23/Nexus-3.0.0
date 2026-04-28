/**
 * models/Resume.js — Mongoose schema for Nexus Resume Builder
 *
 * Each user can have multiple saved resumes.
 * Each resume stores all wizard data + AI-enhanced content + ATS score.
 */

const mongoose = require('mongoose');

/* ── Sub-schemas ─────────────────────────────────────────────── */

const PersonalSchema = new mongoose.Schema({
  name:      { type: String, default: '' },
  email:     { type: String, default: '' },
  phone:     { type: String, default: '' },
  location:  { type: String, default: '' },
  linkedin:  { type: String, default: '' },
  github:    { type: String, default: '' },
  portfolio: { type: String, default: '' },
  summary:   { type: String, default: '' },
}, { _id: false });

const EducationSchema = new mongoose.Schema({
  university: { type: String, default: '' },
  degree:     { type: String, default: '' },
  gpa:        { type: String, default: '' },
  year:       { type: String, default: '' },
  relevant:   { type: String, default: '' },
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
  title:       { type: String, default: '' },
  company:     { type: String, default: '' },
  date:        { type: String, default: '' },
  tech:        { type: String, default: '' },
  description: { type: String, default: '' },
  link:        { type: String, default: '' },
  optimized:   { type: Boolean, default: false },
}, { _id: false });

const ExperienceSchema = new mongoose.Schema({
  role:         { type: String, default: '' },
  organization: { type: String, default: '' },
  location:     { type: String, default: '' },
  startDate:    { type: String, default: '' },
  endDate:      { type: String, default: '' },
  achievements: { type: [String], default: [] },
}, { _id: false });

const CertificationSchema = new mongoose.Schema({
  name:   { type: String, default: '' },
  issuer: { type: String, default: '' },
  year:   { type: String, default: '' },
  link:   { type: String, default: '' },
}, { _id: false });

/* ── Main Resume Schema ───────────────────────────────────────── */

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Resume metadata
    title:    { type: String, default: 'My Resume' },
    template: {
      type: String,
      enum: ['classic', 'modern', 'minimal', 'executive', 'tech'],
      default: 'classic',
    },

    // Job targeting
    targetJD:      { type: String, default: '' },
    targetCompany: { type: String, default: '' },
    targetRole:    { type: String, default: '' },

    // Resume content
    personal:       { type: PersonalSchema, default: () => ({}) },
    education:      { type: [EducationSchema], default: [] },
    skills:         { type: [String], default: [] },
    experiences:    { type: [ExperienceSchema], default: [] },
    projects:       { type: [ProjectSchema], default: [] },
    certifications: { type: [CertificationSchema], default: [] },

    // AI & ATS metadata
    atsScore:        { type: Number, default: 0, min: 0, max: 100 },
    atsKeywords:     { type: [String], default: [] },
    atsMissing:      { type: [String], default: [] },
    aiEnhanced:      { type: Boolean, default: false },
    enhancementNote: { type: String, default: '' },

    // Wizard step completion tracking
    completedSteps: { type: [Number], default: [] },
    isDraft:        { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ── Instance helpers ─────────────────────────────────────────── */

/**
 * Returns a display-friendly summary of this resume
 * (used for dashboard card rendering).
 */
resumeSchema.methods.toCard = function () {
  return {
    _id:           this._id,
    title:         this.title,
    template:      this.template,
    targetRole:    this.targetRole,
    targetCompany: this.targetCompany,
    atsScore:      this.atsScore,
    aiEnhanced:    this.aiEnhanced,
    isDraft:       this.isDraft,
    createdAt:     this.createdAt,
    updatedAt:     this.updatedAt,
    personalName:  this.personal?.name || '',
  };
};

module.exports = mongoose.models.Resume || mongoose.model('Resume', resumeSchema);
