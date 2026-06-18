// Shikaku level generator + uniqueness solver.
// Produces 20 stages of increasing size/difficulty with UNIQUE solutions.
import fs from 'node:fs';

// ---- seeded RNG (mulberry32) for reproducibility ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(20260618);
const rnd = (n) => Math.floor(rng() * n);
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = rnd(i + 1);[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

// ---- random rectangular tiling of W x H ----
function randomTiling(W, H, maxArea) {
  const grid = Array.from({ length: H }, () => Array(W).fill(-1));
  const rects = [];
  const cellOrder = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cellOrder.push([r, c]);
  shuffle(cellOrder);
  let id = 0;
  for (const [r0, c0] of cellOrder) {
    if (grid[r0][c0] !== -1) continue;
    // candidate rectangle shapes anchored with (r0,c0) as top-left, area<=maxArea
    const shapes = [];
    for (let h = 1; h <= H - r0; h++) {
      for (let w = 1; w <= W - c0; w++) {
        const area = w * h;
        if (area > maxArea) continue;
        shapes.push([w, h, area]);
      }
    }
    // bias toward larger rectangles (fewer 1x1) but keep variety
    shapes.sort((a, b) => b[2] - a[2]);
    // weighted-random pick: mostly bigger, sometimes smaller
    let chosen = null;
    const order = [];
    for (const s of shapes) order.push(s);
    // try a randomized but big-leaning order
    shuffle(order);
    order.sort((a, b) => (b[2] + rng() * 3) - (a[2] + rng() * 3));
    for (const [w, h] of order) {
      let ok = true;
      for (let r = r0; r < r0 + h && ok; r++)
        for (let c = c0; c < c0 + w; c++)
          if (grid[r][c] !== -1) { ok = false; break; }
      if (ok) { chosen = [w, h]; break; }
    }
    if (!chosen) chosen = [1, 1];
    const [w, h] = chosen;
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) grid[r][c] = id;
    rects.push({ id, r: r0, c: c0, w, h, area: w * h });
    id++;
  }
  return rects;
}

// ---- choose a clue cell for each rectangle ----
function placeClues(rects) {
  return rects.map((rect) => {
    const cells = [];
    for (let r = rect.r; r < rect.r + rect.h; r++)
      for (let c = rect.c; c < rect.c + rect.w; c++) cells.push([r, c]);
    const [cr, cc] = cells[rnd(cells.length)];
    return { r: cr, c: cc, n: rect.area, rect };
  });
}

// ---- solver: count solutions up to `limit` ----
function countSolutions(W, H, clues, limit = 2) {
  const clueAt = Array.from({ length: H }, () => Array(W).fill(-1));
  clues.forEach((cl, i) => { clueAt[cl.r][cl.c] = i; });

  // candidate rectangles per clue: area === n, contains clue cell, contains exactly one clue
  const candidates = clues.map((cl) => {
    const cand = [];
    const n = cl.n;
    for (let h = 1; h <= n; h++) {
      if (n % h !== 0) continue;
      const w = n / h;
      if (w > W || h > H) continue;
      // top-left positions so rectangle includes (cl.r, cl.c)
      for (let r0 = Math.max(0, cl.r - h + 1); r0 <= Math.min(cl.r, H - h); r0++) {
        for (let c0 = Math.max(0, cl.c - w + 1); c0 <= Math.min(cl.c, W - w); c0++) {
          // count clue cells inside
          let clueCount = 0, ok = true;
          for (let r = r0; r < r0 + h && ok; r++)
            for (let c = c0; c < c0 + w; c++) {
              if (clueAt[r][c] !== -1) clueCount++;
              if (clueCount > 1) { ok = false; break; }
            }
          if (ok && clueCount === 1) cand.push({ r0, c0, w, h });
        }
      }
    }
    return cand;
  });

  if (candidates.some((c) => c.length === 0)) return 0;

  const occupied = Array.from({ length: H }, () => Array(W).fill(false));
  const placed = new Array(clues.length).fill(null);
  let solutions = 0;

  function fits(rect) {
    for (let r = rect.r0; r < rect.r0 + rect.h; r++)
      for (let c = rect.c0; c < rect.c0 + rect.w; c++)
        if (occupied[r][c]) return false;
    return true;
  }
  function mark(rect, v) {
    for (let r = rect.r0; r < rect.r0 + rect.h; r++)
      for (let c = rect.c0; c < rect.c0 + rect.w; c++) occupied[r][c] = v;
  }

  function solve(remaining) {
    if (solutions >= limit) return;
    if (remaining.length === 0) { solutions++; return; }
    // MRV: pick clue with fewest currently-fitting candidates
    let best = -1, bestList = null, bestCount = Infinity;
    for (const idx of remaining) {
      const list = candidates[idx].filter(fits);
      if (list.length < bestCount) { bestCount = list.length; best = idx; bestList = list; if (bestCount === 0) break; }
    }
    if (bestCount === 0) return;
    const rest = remaining.filter((x) => x !== best);
    for (const rect of bestList) {
      mark(rect, true); placed[best] = rect;
      solve(rest);
      mark(rect, false); placed[best] = null;
      if (solutions >= limit) return;
    }
  }
  solve(clues.map((_, i) => i));
  return solutions;
}

// ---- generate one unique puzzle of size W x H ----
function genUnique(W, H, maxArea, tries = 400) {
  let fallback = null;
  for (let t = 0; t < tries; t++) {
    const rects = randomTiling(W, H, maxArea);
    // avoid too many trivial 1x1 (keep < 25% ones)
    const ones = rects.filter((r) => r.area === 1).length;
    if (ones > Math.max(1, Math.floor(rects.length * 0.30))) continue;
    const clues = placeClues(rects);
    const sol = rects.map((rt) => ({ r: rt.r, c: rt.c, w: rt.w, h: rt.h, n: rt.area }));
    const cluesOut = clues.map((cl) => ({ r: cl.r, c: cl.c, n: cl.n }));
    const count = countSolutions(W, H, cluesOut, 2);
    if (count === 1) {
      return { clues: cluesOut, solution: sol };
    }
    if (count >= 1 && !fallback) fallback = { clues: cluesOut, solution: sol };
  }
  return fallback; // may have >1 solution but at least solvable
}

// ---- stage configuration: 20 stages ramping up ----
const STAGES = [
  // [W, H, maxArea]
  [4, 4, 4], [4, 4, 4], [4, 5, 5], [5, 5, 5], [5, 5, 6],
  [5, 6, 6], [6, 6, 6], [6, 6, 8], [6, 7, 8], [7, 7, 8],
  [7, 7, 9], [7, 8, 9], [8, 8, 9], [8, 8, 10], [8, 9, 10],
  [9, 9, 10], [9, 9, 12], [9, 10, 12], [9, 10, 12], [10, 10, 12],
];

const levels = [];
for (let i = 0; i < STAGES.length; i++) {
  const [W, H, maxArea] = STAGES[i];
  let puz = genUnique(W, H, maxArea);
  if (!puz) { console.error(`stage ${i + 1} failed, retry smaller`); puz = genUnique(W, H, maxArea - 1) || genUnique(W, H, 3); }
  const uniqueTag = countSolutions(W, H, puz.clues, 2) === 1 ? 'unique' : 'multi';
  levels.push({ id: i + 1, w: W, h: H, clues: puz.clues, solution: puz.solution });
  console.log(`stage ${String(i + 1).padStart(2)}: ${W}x${H}  clues=${puz.clues.length}  rects=${puz.solution.length}  ${uniqueTag}`);
}

fs.writeFileSync('public/levels.json', JSON.stringify(levels));
console.log(`\nWrote public/levels.json with ${levels.length} stages.`);
