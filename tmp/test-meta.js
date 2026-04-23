const db = require('./l:/nexus/server/db.js');
(async () => {
  const result = await db.getLcProblems({ company: 'Meta', limit: 5 });
  console.log(result.total, 'problems total for Meta');
  process.exit(0);
})();
