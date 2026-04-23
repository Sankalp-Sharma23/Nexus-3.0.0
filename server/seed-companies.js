/**
 * seed-companies.js  –  One-time script to tag LcProblem documents with company names.
 *
 * Usage:   node seed-companies.js
 *
 * Works with MongoDB (if MONGODB_URI is set) or the JSON fallback store.
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const LC_FILE = path.join(__dirname, 'data', 'lc-problems.json');

/* ─── Company → problem IDs mapping ─── */

const COMPANY_PROBLEMS = {
  Meta: [
    1, 8, 11, 14, 15, 26, 27, 31, 38, 42, 43, 67, 71, 76, 88,
    121, 125, 157, 158, 163, 238, 253, 283, 344, 345, 346, 408,
    415, 523, 560, 680, 953, 1004, 1249, 1762,
    // Trees & Graphs
    98, 100, 102, 104, 112, 113, 124, 133, 173, 199, 200, 207,
    210, 226, 236, 269, 270, 285, 297, 314, 426, 543, 695, 785,
    827, 938, 994,
    // Linked Lists
    2, 19, 21, 23, 86, 92, 138, 141, 143, 146, 148, 206,
    // Stacks & Queues
    20, 224, 227, 394, 739, 921,
    // Heaps, Sorting, Binary Search
    33, 34, 50, 69, 74, 162, 215, 278, 347, 528, 704, 852, 973,
    // DP & Backtracking
    17, 22, 46, 62, 68, 70, 78, 79, 90, 122, 139, 140, 198, 213,
    301, 322,
    // Design
    208, 211, 348, 380, 706,
  ],

  Amazon: [
    // Arrays, Strings & Sliding Window
    1, 3, 5, 8, 12, 13, 15, 42, 49, 56, 121, 238, 767, 828, 2104,
    // Trees & Graphs
    98, 102, 127, 200, 207, 210, 236, 543, 909, 994, 1268,
    // Linked Lists
    2, 21, 23, 138, 141,
    // Heaps, Stacks & Queues
    20, 215, 239, 253, 295, 347, 973, 1046,
    // Dynamic Programming
    53, 64, 70, 139, 300, 322,
    // Design
    146, 155, 208, 211, 348, 355, 380, 1152,
  ],

  Google: [
    1, 2, 3, 4, 5, 7, 8, 10, 11, 14, 15, 17, 19, 20, 21, 22, 23, 24, 25, 26,
    28, 29, 31, 32, 33, 34, 36, 38, 39, 41, 42, 44, 45, 46, 48, 49, 50, 51, 53, 54,
    55, 56, 57, 62, 64, 66, 68, 69, 70, 72, 73, 74, 75, 76, 78, 79, 84, 85, 88, 90,
    94, 98, 102, 104, 105, 110, 114, 118, 121, 122, 124, 127, 128, 130, 131, 133, 134, 138, 139, 140,
    142, 146, 148, 150, 152, 153, 155, 160, 162, 163, 166, 169, 173, 188, 198, 200, 202, 205, 206, 207,
    208, 210, 212, 215, 218, 221, 224, 226, 227, 230, 234, 236, 238, 239, 240, 253, 268, 269, 273, 278,
    279, 282, 283, 289, 295, 297, 300, 305, 308, 309, 312, 315, 317, 322, 328, 329, 332, 338, 340, 344,
    347, 348, 354, 359, 362, 380, 387, 394, 399, 402, 406, 410, 415, 417, 424, 426, 448, 460, 480, 489,
    498, 528, 543, 560, 621, 681, 692, 704, 715, 721, 727, 729, 731, 732, 739, 743, 752, 759, 767, 778,
    787, 792, 802, 815, 833, 843, 844, 849, 852, 853, 857, 862, 875, 887, 895, 900, 904, 929, 934, 938,
    939, 947, 951, 973, 981, 987, 994, 1004, 1048, 1055, 1091, 1101, 1110, 1146, 1277, 1293, 1423, 1937, 2013, 2096, 2115,
  ],
};

/* ─── Main ─── */

(async () => {
  // Build id → [companies] map
  const idToCompanies = {};
  for (const [company, ids] of Object.entries(COMPANY_PROBLEMS)) {
    for (const id of ids) {
      if (!idToCompanies[id]) idToCompanies[id] = [];
      if (!idToCompanies[id].includes(company)) idToCompanies[id].push(company);
    }
  }

  const totalIds = Object.keys(idToCompanies).length;
  console.log(`[seed-companies] ${totalIds} unique problem IDs across ${Object.keys(COMPANY_PROBLEMS).length} companies`);

  // Try MongoDB first
  if (process.env.MONGODB_URI) {
    const mongoose = require('mongoose');
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
      });
      console.log('[seed-companies] MongoDB connected ✓');

      const LcProblem = require('./models/LcProblem');

      // First, reset all companies arrays
      await LcProblem.updateMany({}, { $set: { companies: [] } });

      // Bulk update each problem with its companies
      const ops = Object.entries(idToCompanies).map(([id, companies]) => ({
        updateOne: {
          filter: { id: parseInt(id, 10) },
          update: { $set: { companies } },
        },
      }));

      const result = await LcProblem.bulkWrite(ops, { ordered: false });
      console.log(`[seed-companies] MongoDB: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
      await mongoose.disconnect();
      console.log('[seed-companies] Done ✓');
      process.exit(0);
    } catch (err) {
      console.warn('[seed-companies] MongoDB failed:', err.message, '— trying JSON fallback');
    }
  }

  // JSON fallback
  try {
    const raw = JSON.parse(fs.readFileSync(LC_FILE, 'utf8'));
    const problems = raw.problems ?? [];
    let updated = 0;

    for (const p of problems) {
      const companies = idToCompanies[p.id];
      if (companies) {
        p.companies = companies;
        updated++;
      } else {
        p.companies = [];
      }
    }

    fs.writeFileSync(LC_FILE, JSON.stringify({ saved_at: raw.saved_at, problems }, null, 2), 'utf8');
    console.log(`[seed-companies] JSON: updated ${updated} / ${problems.length} problems`);
    console.log('[seed-companies] Done ✓');
  } catch (err) {
    console.error('[seed-companies] JSON fallback failed:', err.message);
    process.exit(1);
  }
})();
