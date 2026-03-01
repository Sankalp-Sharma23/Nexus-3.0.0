const fs = require('fs');
const FILE = 'l:/nexus/server/data/problems.json';
const problems = JSON.parse(fs.readFileSync(FILE, 'utf8'));

problems.forEach(p => {
  if (p.id === 236) {
    p.title        = 'Implement strStr()';
    p.title_slug   = 'implement-str-str';
    p.difficulty   = 'Easy';
    p.category     = 'Interview';
    p.leetcode_url = 'https://leetcode.com/problems/implement-strstr/';
  }
  if (p.id === 288) {
    p.title        = 'Customers Who Bought All Products';
    p.title_slug   = 'customers-who-bought-all-products';
    p.difficulty   = 'Medium';
    p.category     = 'Database';
    p.leetcode_url = 'https://leetcode.com/problems/customers-who-bought-all-products/';
  }
});

fs.writeFileSync(FILE, JSON.stringify(problems, null, 2), 'utf8');

const slugs = problems.map(p => p.title_slug);
const dups = slugs.filter((s, i) => slugs.indexOf(s) !== i);
console.log('Dupes remaining:', dups.length === 0 ? 'NONE' : dups);
console.log('Total problems:', problems.length);

