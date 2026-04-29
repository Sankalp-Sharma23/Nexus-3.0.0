
const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema(
  {
    uid:          { type: String, unique: true, required: true, index: true },
    title:        { type: String, default: 'Untitled Hackathon' },
    organizer:    { type: String, default: 'Unknown' },
    logo:         { type: String, default: null },
    location:     { type: String, default: 'Online' },
    mode:         { type: String, default: 'Online' },         // Online | In-Person | Hybrid
    prize:        { type: String, default: null },             // "$50,000" or null
    prizeRaw:     { type: Number, default: 0 },                // numeric for sorting
    participants: { type: String, default: null },             // "2,000+" or null
    startDate:    { type: Date,   default: null },
    endDate:      { type: Date,   default: null },
    deadline:     { type: Date,   default: null },             // registration deadline
    tags:         { type: [String], default: [] },
    difficulty:   { type: String, default: 'All Levels' },     // Beginner | Intermediate | Advanced | All Levels
    status:       { type: String, default: 'upcoming', index: true }, // live | upcoming | ended
    url:          { type: String, default: '#' },
    description:  { type: String, default: '' },
    source:       { type: String, default: 'unknown', index: true },  // devpost | mlh | hackerearth | devfolio | unstop | dorahacks | lablab
    category:     { type: String, default: 'general' },        // ai | web3 | hardware | climate | data | general
    featured:     { type: Boolean, default: false, index: true },
    scrapedAt:    { type: Date,   default: Date.now, index: true },
  },
  { timestamps: true }
);

hackathonSchema.index({ startDate:  1 });
hackathonSchema.index({ prizeRaw:  -1 });
hackathonSchema.index({ category:   1 });
hackathonSchema.index({ title: 'text', organizer: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.models.Hackathon || mongoose.model('Hackathon', hackathonSchema);
