
const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema(
  {
    uid:          { type: String, unique: true, required: true, index: true },
    title:        { type: String, default: 'Internship' },          // role/position name
    organizer:    { type: String, default: 'Unknown' },             // company name
    logo:         { type: String, default: null },
    location:     { type: String, default: 'Online' },
    mode:         { type: String, default: 'Online' },              // Online | In-Person | Hybrid
    stipend:      { type: String, default: null },                  // "₹15,000/mo" or "$1,200/mo" etc.
    stipendRaw:   { type: Number, default: 0 },                     // numeric (INR) for sorting
    duration:     { type: String, default: null },                  // "3 months", "6 months", etc.
    applicants:   { type: String, default: null },                  // "1,200 applied"
    deadline:     { type: Date,   default: null },
    startDate:    { type: Date,   default: null },
    tags:         { type: [String], default: [] },
    status:       { type: String, default: 'open', index: true },   // open | closed
    url:          { type: String, default: '#' },
    description:  { type: String, default: '' },
    source:       { type: String, default: 'unknown', index: true },// internshala | unstop | naukri | ...
    category:     { type: String, default: 'general' },             // engineering | design | data | product | marketing | general
    featured:     { type: Boolean, default: false, index: true },
    scrapedAt:    { type: Date,   default: Date.now, index: true },
  },
  { timestamps: true }
);

internshipSchema.index({ deadline:   1 });
internshipSchema.index({ stipendRaw:-1 });
internshipSchema.index({ category:   1 });
internshipSchema.index({ title: 'text', organizer: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.models.Internship || mongoose.model('Internship', internshipSchema);
