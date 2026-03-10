require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs');

const AimPlanSchema = new mongoose.Schema({
  userId:    { type: String, required: true, unique: true, index: true },
  plan:      { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now },
});
const AimPlan = mongoose.model('AimPlan', AimPlanSchema);

const plans   = JSON.parse(fs.readFileSync('data/aim-plans.json', 'utf8'));
const entries = Object.values(plans);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('[migrate] Connected to MongoDB');
    let count = 0;
    for (const plan of entries) {
      await AimPlan.findOneAndUpdate(
        { userId: plan.userId },
        { $set: { plan, updatedAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      );
      console.log('[migrate] Migrated userId:', plan.userId);
      count++;
    }
    console.log('[migrate] Done. Migrated', count, 'plan(s).');
    await mongoose.disconnect();
  })
  .catch(e => { console.error('[migrate] Error:', e.message); process.exit(1); });
