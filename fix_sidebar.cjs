const fs = require('fs');
const file = 'l:/nexus/src/components/PracticeHub.jsx';
let src = fs.readFileSync(file, 'utf8');

// Find the old CategorySidebar block
const startMarker = '/* ─────────────── CategorySidebar ─────────────── */';
const mainMarker  = '/* ─────────────── Main PracticeHub ─────────────── */';

const start = src.indexOf(startMarker);
const end   = src.indexOf(mainMarker);

if (start === -1 || end === -1) {
  console.log('Markers not found! start:', start, 'end:', end);
  process.exit(1);
}

const before = src.slice(0, start);
const after  = src.slice(end);

const newSidebar = `/* ─────────────── CategorySidebar ─────────────── */
function CategorySidebar({ catStats, catSolvedMap, totalProblems, totalSolved, selected, onSelect }) {
  return (
    <aside className="ph-sidebar">
      <div className="ph-sidebar-header">
        <Target size={16} />
        <span>Categories</span>
      </div>

      <CatButton cat={null} icon={<BookOpen size={15} />} name="All Problems"
        solved={totalSolved} total={totalProblems} isAllBtn selected={selected} onSelect={onSelect} />

      {CATEGORY_GROUPS.map(({ label, categories: groupCats }) => {
        const visibleCats = groupCats.filter(c => catStats[c]);
        if (visibleCats.length === 0) return null;
        return (
          <div key={label} className="ph-cat-group">
            <div className="ph-cat-group-label">{label}</div>
            {visibleCats.map(cat => (
              <CatButton
                key={cat} cat={cat}
                icon={CATEGORY_ICONS[cat] ?? <BookOpen size={15} />}
                name={cat} solved={catSolvedMap[cat] ?? 0} total={catStats[cat]}
                selected={selected} onSelect={onSelect}
              />
            ))}
          </div>
        );
      })}

      {/* "Other" catch-all for any tags not covered by the groups above */}
      {(() => {
        const otherCats = Object.keys(catStats).filter(c => !GROUPED_CATS.has(c)).sort();
        if (otherCats.length === 0) return null;
        return (
          <div className="ph-cat-group">
            <div className="ph-cat-group-label">Other</div>
            {otherCats.map(cat => (
              <CatButton
                key={cat} cat={cat}
                icon={CATEGORY_ICONS[cat] ?? <BookOpen size={15} />}
                name={cat} solved={catSolvedMap[cat] ?? 0} total={catStats[cat]}
                selected={selected} onSelect={onSelect}
              />
            ))}
          </div>
        );
      })()}
    </aside>
  );
}

`;

fs.writeFileSync(file, before + newSidebar + after, 'utf8');
console.log('DONE - CategorySidebar replaced');
// Verify
const check = fs.readFileSync(file, 'utf8');
console.log('New signature present:', check.includes('function CategorySidebar({ catStats'));
console.log('Old signature gone:   ', !check.includes('function CategorySidebar({ problems'));
