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

// ---- random rectangular tiling of W x H (blocked cells are obstacles/rocks) ----
function randomTiling(W, H, maxArea, blocked = new Set()) {
  const grid = Array.from({ length: H }, () => Array(W).fill(-1));
  for (const key of blocked) grid[Math.floor(key / W)][key % W] = -2; // rock = occupied
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
// blocked: Set of rock cell keys (r*W+c) that no rectangle may cover.
// squareClues: Set of clue indices whose rectangle must be a square (snapper).
function countSolutions(W, H, clues, limit = 2, blocked = new Set(), squareClues = new Set()) {
  const clueAt = Array.from({ length: H }, () => Array(W).fill(-1));
  clues.forEach((cl, i) => { clueAt[cl.r][cl.c] = i; });

  // candidate rectangles per clue: area === n, contains clue cell, contains exactly one clue
  const candidates = clues.map((cl, ci) => {
    const cand = [];
    const n = cl.n;
    const mustSquare = squareClues.has(ci);
    for (let h = 1; h <= n; h++) {
      if (n % h !== 0) continue;
      const w = n / h;
      if (w > W || h > H) continue;
      if (mustSquare && w !== h) continue;       // snapper: square patches only
      // top-left positions so rectangle includes (cl.r, cl.c)
      for (let r0 = Math.max(0, cl.r - h + 1); r0 <= Math.min(cl.r, H - h); r0++) {
        for (let c0 = Math.max(0, cl.c - w + 1); c0 <= Math.min(cl.c, W - w); c0++) {
          // must contain exactly one clue and no rock
          let clueCount = 0, ok = true;
          for (let r = r0; r < r0 + h && ok; r++)
            for (let c = c0; c < c0 + w; c++) {
              if (blocked.has(r * W + c)) { ok = false; break; }
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

// pick up to k distinct random items (consumes rng)
function pickK(arr, k) { const a = arr.slice(); shuffle(a); return a.slice(0, Math.min(k, a.length)); }

// ---- generate one unique puzzle with special-turtle features ----
// feats: { mystery, shy, snapper, rocks } counts
function genUniqueFeatured(W, H, maxArea, feats, tries = 800) {
  const rocksN = feats.rocks || 0, snapN = feats.snapper || 0;
  const mysN = feats.mystery || 0, shyN = feats.shy || 0;
  for (let t = 0; t < tries; t++) {
    const allCells = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) allCells.push(r * W + c);
    const rockKeys = rocksN ? pickK(allCells, rocksN) : [];
    const blocked = new Set(rockKeys);
    const rects = randomTiling(W, H, maxArea, blocked);
    const ones = rects.filter((r) => r.area === 1).length;
    if (ones > Math.max(2, Math.floor(rects.length * 0.32))) continue;
    // snapper candidates: square rectangles with a perfect-square area
    const squareIdx = rects.map((rt, i) => ({ i, rt }))
      .filter((o) => o.rt.w === o.rt.h && [4, 9, 16].includes(o.rt.area)).map((o) => o.i);
    if (snapN && squareIdx.length < snapN) continue;
    const snapPick = snapN ? pickK(squareIdx, snapN) : [];
    const squareClues = new Set(snapPick);
    const clues = placeClues(rects);
    const sol = rects.map((rt) => ({ r: rt.r, c: rt.c, w: rt.w, h: rt.h, n: rt.area }));
    const cluesOut = clues.map((cl) => ({ r: cl.r, c: cl.c, n: cl.n }));
    if (countSolutions(W, H, cluesOut, 2, blocked, squareClues) !== 1) continue;
    // assign types (each clue at most one type)
    const types = new Array(cluesOut.length).fill(null);
    snapPick.forEach((i) => { types[i] = 'snapper'; });
    const freeIdx = cluesOut.map((_, i) => i).filter((i) => !types[i]);
    const picked = pickK(freeIdx, mysN + shyN);
    picked.slice(0, mysN).forEach((i) => { types[i] = 'mystery'; });
    picked.slice(mysN, mysN + shyN).forEach((i) => { types[i] = 'shy'; });
    cluesOut.forEach((cl, i) => { if (types[i]) cl.type = types[i]; });
    return { clues: cluesOut, solution: sol, rocks: rockKeys.map((k) => ({ r: Math.floor(k / W), c: k % W })) };
  }
  return null;
}

// ---- stage configuration: 50 stages ramping up ----
// NOTE: the first 20 entries are unchanged so the seeded RNG reproduces the
// original stages 1-20 byte-for-byte; stages 21-50 are appended.
const STAGES = [
  // [W, H, maxArea]
  [4, 4, 4], [4, 4, 4], [4, 5, 5], [5, 5, 5], [5, 5, 6],
  [5, 6, 6], [6, 6, 6], [6, 6, 8], [6, 7, 8], [7, 7, 8],
  [7, 7, 9], [7, 8, 9], [8, 8, 9], [8, 8, 10], [8, 9, 10],
  [9, 9, 10], [9, 9, 12], [9, 10, 12], [9, 10, 12], [10, 10, 12],
  // 21-30 : medium-hard, mixed shapes
  [8, 8, 9], [8, 9, 10], [9, 9, 10], [9, 9, 12], [8, 10, 10],
  [10, 9, 12], [9, 10, 12], [10, 10, 12], [10, 10, 12], [10, 10, 14],
  // 31-40 : hard, bigger boards & wider/taller variety
  [10, 11, 12], [11, 10, 12], [10, 12, 12], [11, 11, 12], [11, 11, 14],
  [10, 11, 14], [11, 10, 14], [11, 11, 14], [11, 12, 12], [12, 11, 14],
  // 41-50 : expert
  [11, 11, 14], [10, 12, 14], [11, 12, 14], [11, 11, 16], [10, 12, 16],
  [11, 12, 14], [11, 11, 16], [11, 12, 16], [11, 11, 18], [11, 12, 18],
];

// ---- special-turtle feature ramp (stage index -> counts). Stages 1-20 stay plain. ----
const FEATURES = {
  20: { mystery: 1 }, 21: { mystery: 1 }, 22: { mystery: 2 }, 23: { mystery: 2 },
  24: { shy: 1 }, 25: { shy: 1 }, 26: { shy: 2 }, 27: { mystery: 1, shy: 1 },
  28: { rocks: 1 }, 29: { rocks: 2 }, 30: { rocks: 2 }, 31: { mystery: 1, rocks: 1 },
  32: { snapper: 1 }, 33: { snapper: 1 }, 34: { snapper: 2 }, 35: { shy: 1, snapper: 1 },
  36: { mystery: 2, shy: 1 }, 37: { mystery: 1, rocks: 2 }, 38: { shy: 2, snapper: 1 }, 39: { mystery: 1, shy: 1, rocks: 1 },
  40: { mystery: 2, snapper: 1 }, 41: { shy: 2, rocks: 2 }, 42: { mystery: 1, shy: 1, snapper: 1 }, 43: { mystery: 2, shy: 2 },
  44: { mystery: 2, shy: 1, rocks: 2 }, 45: { shy: 2, snapper: 2, rocks: 1 }, 46: { mystery: 2, shy: 2, snapper: 1 }, 47: { mystery: 2, shy: 2, rocks: 2 },
  48: { mystery: 3, shy: 2, snapper: 1, rocks: 1 }, 49: { mystery: 2, shy: 2, snapper: 2, rocks: 2 },
};

const levels = [];
for (let i = 0; i < STAGES.length; i++) {
  const [W, H, maxArea] = STAGES[i];
  const feats = FEATURES[i] || {};
  const hasFeat = !!(feats.mystery || feats.shy || feats.snapper || feats.rocks);
  let puz = hasFeat ? (genUniqueFeatured(W, H, maxArea, feats) || genUnique(W, H, maxArea)) : genUnique(W, H, maxArea);
  if (!puz) { console.error(`stage ${i + 1} failed, retry smaller`); puz = genUnique(W, H, maxArea - 1) || genUnique(W, H, 3); }
  const lvl = { id: i + 1, w: W, h: H, clues: puz.clues, solution: puz.solution };
  if (puz.rocks && puz.rocks.length) lvl.rocks = puz.rocks;
  levels.push(lvl);
  const types = puz.clues.reduce((a, c) => { if (c.type) a[c.type] = (a[c.type] || 0) + 1; return a; }, {});
  const tag = [puz.rocks && puz.rocks.length ? `rocks=${puz.rocks.length}` : '', types.mystery ? `M${types.mystery}` : '', types.shy ? `S${types.shy}` : '', types.snapper ? `K${types.snapper}` : ''].filter(Boolean).join(' ');
  console.log(`stage ${String(i + 1).padStart(2)}: ${W}x${H}  clues=${puz.clues.length}  ${tag}`);
}

fs.writeFileSync('public/levels.json', JSON.stringify(levels));
console.log(`\nWrote public/levels.json with ${levels.length} stages.`);
