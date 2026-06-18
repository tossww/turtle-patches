/* Turtle Patches — a cozy ocean Shikaku puzzle. Vanilla JS, no build step. */
(() => {
  'use strict';

  // ---------- assets ----------
  const SPRITES = [
    'turtle_green', 'turtle_baby_blue', 'turtle_sleepy_yellow', 'turtle_snorkel',
    'turtle_pink', 'turtle_flowercrown', 'turtle_partyhat', 'turtle_golden',
    'turtle_headband', 'turtle_astronaut', 'turtle_rainbow', 'turtle_pirate'
  ];
  const spriteSrc = (name) => `assets/${name}.png`;

  // patch colors (cycled per clue)
  const PALETTE = ['#2bb6a3', '#ff8a7a', '#6c8cff', '#f6b53e', '#b06cff',
    '#ff6fae', '#3bbf6b', '#ff9b3d', '#36b8d6', '#9d7bff'];

  // ---------- state ----------
  const HINTS_PER_STAGE = 3;
  let LEVELS = [];
  let cur = null;          // current level object (+ derived)
  let curIndex = 0;
  let patches = [];        // committed: {id,c,r,wc,hc,clueIndex,color}
  let cellPx = 40;
  let hintsLeft = HINTS_PER_STAGE;
  let patchId = 1;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- progress (localStorage) ----------
  const PKEY = 'turtlePatches.progress.v1';
  function loadProg() {
    try { return JSON.parse(localStorage.getItem(PKEY)) || { stars: {}, unlocked: 1 }; }
    catch { return { stars: {}, unlocked: 1 }; }
  }
  function saveProg(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} }
  let prog = loadProg();

  // ---------- navigation ----------
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  }

  // ---------- home ----------
  $('#playBtn').addEventListener('click', () => { buildLevelGrid(); show('levels'); });
  $('#howBtn').addEventListener('click', () => openHow());
  $$('[data-nav]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.nav;
    if (t === 'levels') buildLevelGrid();
    show(t);
  }));

  // ---------- level select ----------
  function buildLevelGrid() {
    const grid = $('#levelGrid');
    grid.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const stage = i + 1;
      const unlocked = stage <= prog.unlocked;
      const stars = prog.stars[stage] || 0;
      const cell = document.createElement('button');
      cell.className = 'level-cell' + (stars ? ' done' : '') + (unlocked ? '' : ' locked');
      cell.innerHTML = unlocked
        ? `<span class="lv-num">${stage}</span><span class="lv-stars">${stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : ''}</span>`
        : `<span class="lock">🔒</span><span class="lv-num">${stage}</span><span class="lv-stars"></span>`;
      if (unlocked) cell.addEventListener('click', () => startStage(i));
      grid.appendChild(cell);
    });
  }

  // ---------- start a stage ----------
  function startStage(index) {
    curIndex = index;
    const raw = LEVELS[index];
    // derive clue lookup grid + colors + sprites
    const clueAt = Array.from({ length: raw.h }, () => Array(raw.w).fill(-1));
    raw.clues.forEach((cl, ci) => { clueAt[cl.r][cl.c] = ci; });
    cur = {
      ...raw,
      clueAt,
      clueMeta: raw.clues.map((cl, ci) => ({
        ...cl, color: PALETTE[ci % PALETTE.length],
        sprite: SPRITES[(ci + index * 5) % SPRITES.length]
      })),
    };
    patches = [];
    patchId = 1;
    hintsLeft = HINTS_PER_STAGE;
    $('#stageNum').textContent = index + 1;
    $('#hintCount').textContent = hintsLeft;
    renderBoard();
    layout();
    renderPatches();
    renderPips();
    show('game');
  }

  $('#restartBtn').addEventListener('click', () => {
    patches = [];
    $$('.cell').forEach(c => c.classList.remove('awake'));
    renderPatches(); renderPips();
  });

  // ---------- render board ----------
  function renderBoard() {
    const board = $('#board');
    board.style.gridTemplateColumns = `repeat(${cur.w}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${cur.h}, 1fr)`;
    board.innerHTML = '';
    for (let r = 0; r < cur.h; r++) {
      for (let c = 0; c < cur.w; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (c === cur.w - 1) cell.classList.add('no-r');
        if (r === cur.h - 1) cell.classList.add('no-b');
        cell.dataset.r = r; cell.dataset.c = c;
        const ci = cur.clueAt[r][c];
        if (ci !== -1) {
          const m = cur.clueMeta[ci];
          const d1 = (-(ci * 0.73) % 4.4).toFixed(2);   // desync blink
          const d2 = (-(ci * 0.41) % 3.2).toFixed(2);   // desync bob
          cell.innerHTML =
            `<div class="turtle sprite" style="background-image:url('${spriteSrc(m.sprite)}');animation-delay:${d1}s,${d2}s"></div>` +
            `<span class="zzz">z</span>` +
            `<span class="num">${m.n}</span>`;
          cell.dataset.clue = ci;
        }
        board.appendChild(cell);
      }
    }
  }

  // ---------- layout (size board to viewport) ----------
  function layout() {
    const wrap = $('.board-wrap');
    const availW = wrap.clientWidth - 4;
    const availH = wrap.clientHeight - 4;
    cellPx = Math.floor(Math.min(availW / cur.w, availH / cur.h));
    cellPx = Math.max(28, cellPx);
    const bw = cellPx * cur.w, bh = cellPx * cur.h;
    const stage = $('#boardStage');
    stage.style.width = bw + 'px';
    stage.style.height = bh + 'px';
    const board = $('#board');
    board.style.width = bw + 'px';
    board.style.height = bh + 'px';
  }
  window.addEventListener('resize', () => {
    if ($('#game').classList.contains('active')) { layout(); renderPatches(); }
  });

  // ---------- patches render ----------
  function renderPatches() {
    const layer = $('#drawLayer');
    layer.innerHTML = '';
    patches.forEach(p => layer.appendChild(patchEl(p)));
    // awake state on satisfied clues
    $$('.cell').forEach(cell => {
      const ci = cell.dataset.clue;
      if (ci === undefined) return;
      const sat = patches.some(p => p.clueIndex === +ci);
      cell.classList.toggle('awake', sat);
    });
  }

  function patchEl(p, preview = false, bad = false) {
    const el = document.createElement('div');
    el.className = 'patch' + (preview ? ' preview' : '') + (bad ? ' bad' : '');
    el.style.setProperty('--pc', p.color || '#2bb6a3');
    el.style.left = p.c * cellPx + 'px';
    el.style.top = p.r * cellPx + 'px';
    el.style.width = p.wc * cellPx + 'px';
    el.style.height = p.hc * cellPx + 'px';
    if (preview) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = `${p.wc * p.hc}`;
      el.appendChild(badge);
    } else {
      el.dataset.pid = p.id;
      el.addEventListener('pointerdown', (e) => { e.stopPropagation(); removePatch(p.id); });
    }
    return el;
  }

  function removePatch(id) {
    patches = patches.filter(p => p.id !== id);
    renderPatches(); renderPips();
  }

  // ---------- drawing interaction ----------
  const stageEl = $('#boardStage');
  let drawing = null; // {sr, sc}
  let previewEl = null;

  function cellFromEvent(e) {
    const rect = $('#board').getBoundingClientRect();
    let c = Math.floor((e.clientX - rect.left) / cellPx);
    let r = Math.floor((e.clientY - rect.top) / cellPx);
    c = Math.min(cur.w - 1, Math.max(0, c));
    r = Math.min(cur.h - 1, Math.max(0, r));
    return { r, c };
  }

  stageEl.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('patch')) return; // handled by patch
    e.preventDefault();
    stageEl.setPointerCapture(e.pointerId);
    const { r, c } = cellFromEvent(e);
    drawing = { sr: r, sc: c };
    updatePreview(r, c);
  });
  stageEl.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const { r, c } = cellFromEvent(e);
    updatePreview(r, c);
  });
  stageEl.addEventListener('pointerup', (e) => {
    if (!drawing) return;
    const { r, c } = cellFromEvent(e);
    finalize(r, c);
    drawing = null;
    if (previewEl) { previewEl.remove(); previewEl = null; }
  });
  stageEl.addEventListener('pointercancel', () => {
    drawing = null;
    if (previewEl) { previewEl.remove(); previewEl = null; }
  });

  function rectFrom(sr, sc, er, ec) {
    const r = Math.min(sr, er), c = Math.min(sc, ec);
    const hc = Math.abs(er - sr) + 1, wc = Math.abs(ec - sc) + 1;
    return { r, c, wc, hc };
  }

  function evaluate(rc) {
    // returns {valid, clueIndex, reason}
    let clueIndex = -1, clueCount = 0;
    for (let r = rc.r; r < rc.r + rc.hc; r++)
      for (let c = rc.c; c < rc.c + rc.wc; c++) {
        const ci = cur.clueAt[r][c];
        if (ci !== -1) { clueCount++; clueIndex = ci; }
      }
    if (clueCount !== 1) return { valid: false };
    if (rc.wc * rc.hc !== cur.clueMeta[clueIndex].n) return { valid: false };
    // overlap check
    for (const p of patches) {
      if (!(rc.c + rc.wc <= p.c || p.c + p.wc <= rc.c || rc.r + rc.hc <= p.r || p.r + p.hc <= rc.r))
        return { valid: false };
    }
    return { valid: true, clueIndex };
  }

  function updatePreview(er, ec) {
    const rc = rectFrom(drawing.sr, drawing.sc, er, ec);
    const ev = evaluate(rc);
    const color = ev.valid ? cur.clueMeta[ev.clueIndex].color : '#ff8a7a';
    if (previewEl) previewEl.remove();
    previewEl = patchEl({ ...rc, color }, true);
    $('#drawLayer').appendChild(previewEl);
  }

  function finalize(er, ec) {
    const rc = rectFrom(drawing.sr, drawing.sc, er, ec);
    // ignore pure taps on empty cell with no drag
    const single = rc.wc === 1 && rc.hc === 1;
    const ev = evaluate(rc);
    if (!ev.valid) {
      if (!single) flashBad(rc);
      return;
    }
    const m = cur.clueMeta[ev.clueIndex];
    patches.push({ id: patchId++, c: rc.c, r: rc.r, wc: rc.wc, hc: rc.hc, clueIndex: ev.clueIndex, color: m.color });
    renderPatches(); renderPips();
    haptic();
    if (patches.length === cur.clues.length) onWin();
  }

  function flashBad(rc) {
    const el = patchEl({ ...rc, color: '#ff8a7a' }, false, true);
    el.classList.add('preview'); // no pointer
    $('#drawLayer').appendChild(el);
    setTimeout(() => el.remove(), 360);
  }

  // ---------- pips ----------
  function renderPips() {
    const pips = $('#progressPips');
    pips.innerHTML = '';
    for (let i = 0; i < cur.clues.length; i++) {
      const d = document.createElement('div');
      d.className = 'pip' + (i < patches.length ? ' on' : '');
      pips.appendChild(d);
    }
  }

  // ---------- hints ----------
  $('#hintBtn').addEventListener('click', () => {
    if (hintsLeft <= 0) { flashHint(); return; }
    // find a solution rect whose clue is not yet satisfied
    const sol = cur.solution;
    for (const s of sol) {
      // find the clue index inside this solution rect
      let idx = -1;
      for (let r = s.r; r < s.r + s.h; r++)
        for (let c = s.c; c < s.c + s.w; c++)
          if (cur.clueAt[r][c] !== -1) idx = cur.clueAt[r][c];
      if (idx === -1) continue;
      if (patches.some(p => p.clueIndex === idx)) continue; // already done
      // clear overlapping patches
      patches = patches.filter(p =>
        (s.c + s.w <= p.c || p.c + p.wc <= s.c || s.r + s.h <= p.r || p.r + p.hc <= s.r));
      patches.push({ id: patchId++, c: s.c, r: s.r, wc: s.w, hc: s.h, clueIndex: idx, color: cur.clueMeta[idx].color });
      hintsLeft--;
      $('#hintCount').textContent = hintsLeft;
      renderPatches(); renderPips();
      if (patches.length === cur.clues.length) onWin();
      return;
    }
  });
  function flashHint() { const b = $('#hintBtn'); b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 400); }

  // ---------- win ----------
  function onWin() {
    // animate awake
    $$('.cell.awake').forEach((cell, i) => {
      setTimeout(() => {
        cell.querySelector('.turtle')?.classList.remove('x');
        cell.classList.remove('awake'); void cell.offsetWidth; cell.classList.add('awake');
      }, i * 50);
    });
    const stars = computeStars();
    const stage = curIndex + 1;
    prog.stars[stage] = Math.max(prog.stars[stage] || 0, stars);
    prog.unlocked = Math.max(prog.unlocked, Math.min(LEVELS.length, stage + 1));
    saveProg(prog);
    setTimeout(() => openWin(stars), 650);
  }

  function computeStars() {
    // 3 stars if no hints used, 2 if 1 hint, else 1
    const used = HINTS_PER_STAGE - hintsLeft;
    return used === 0 ? 3 : used === 1 ? 2 : 1;
  }

  function openWin(stars) {
    $('#winTurtle').style.backgroundImage = `url('${spriteSrc(SPRITES[curIndex % SPRITES.length])}')`;
    $('#winStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const last = curIndex >= LEVELS.length - 1;
    $('#winSub').textContent = last ? 'You woke every turtle in the sea! 🐢💖' : 'The turtles are wide awake! 🎉';
    $('#winNext').textContent = last ? 'Finish' : 'Next ›';
    spawnConfetti($('#winModal .confetti'));
    $('#winModal').classList.add('show');
  }
  $('#winReplay').addEventListener('click', () => { $('#winModal').classList.remove('show'); startStage(curIndex); });
  $('#winNext').addEventListener('click', () => {
    $('#winModal').classList.remove('show');
    if (curIndex >= LEVELS.length - 1) { buildLevelGrid(); show('levels'); }
    else startStage(curIndex + 1);
  });

  function spawnConfetti(holder) {
    if (!holder) return;
    holder.innerHTML = '';
    const cols = ['#2bb6a3', '#ff8a7a', '#f6b53e', '#6c8cff', '#ff6fae', '#3bbf6b'];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = cols[i % cols.length];
      s.style.animationDelay = (Math.random() * 1.2) + 's';
      s.style.animationDuration = (1.2 + Math.random()) + 's';
      holder.appendChild(s);
    }
  }

  // ---------- how to play ----------
  function openHow() {
    const demo = $('#howDemo');
    demo.innerHTML = miniDemo();
    $('#howModal').classList.add('show');
  }
  $('#howClose').addEventListener('click', () => $('#howModal').classList.remove('show'));
  function miniDemo() {
    return `<div style="display:inline-grid;grid-template-columns:repeat(3,46px);grid-template-rows:repeat(2,46px);
      border-radius:14px;overflow:hidden;outline:4px solid #fff;box-shadow:var(--shadow-sm);position:relative;background:#fff">
      ${Array.from({ length: 6 }).map((_, i) =>
        `<div style="border-right:1.5px solid var(--cell-line);border-bottom:1.5px solid var(--cell-line);display:grid;place-items:center;position:relative">
          ${i === 1 ? `<div class="turtle sprite" style="width:84%;height:84%;animation:none;background-image:url('assets/turtle_green.png')"></div><span class="num">3</span>` : ''}
        </div>`).join('')}
      <div style="position:absolute;left:0;top:0;width:138px;height:46px;border:5px solid var(--teal);border-radius:12px;
        background:color-mix(in srgb,var(--teal) 18%,transparent)"></div>
    </div>`;
  }

  // ---------- misc ----------
  function haptic() { if (navigator.vibrate) navigator.vibrate(8); }

  // ---------- boot ----------
  async function boot() {
    try {
      const res = await fetch('levels.json', { cache: 'no-store' });
      LEVELS = await res.json();
    } catch (e) {
      console.error('Failed to load levels', e);
      LEVELS = [];
    }
    prog = loadProg();
  }
  boot();
})();
