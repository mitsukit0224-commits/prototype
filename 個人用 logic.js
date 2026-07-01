// ================================================================
//  logic.js — ゲームロジック・物理・入力・UI
//  依存: levels.js (T, DIRS, STAGES)
//        renderer.js (render, initTitleParticles, animateTitleParticles)
// ================================================================

// ================================================================
//  Game state
// ================================================================
let state = {
  stage: 0,
  grid: [],
  rows: 0, cols: 0,
  playerPos: { x: 0, y: 0 },
  enemyPos: { x: 0, y: 0 },
  shadowPos: { x: 0, y: 0 },
  enemyHistory: [],
  gravity: 'DOWN',
  hasKey: false,
  moves: 0,
  history: [],
  cellSize: 56,
  offsetX: 0, offsetY: 0,
  particles: [],
  gravRotation: 0,
  shakeTime: 0,
  fallAnimations: [],
  gameStarted: false,
  gameOver: false,
  won: false,
};

// ================================================================
//  Utility
// ================================================================
function deepCopy(g) { return g.map(r => [...r]); }

function findAll(grid, type) {
  const res = [];
  for (let y = 0; y < grid.length; y++)
    for (let x = 0; x < grid[y].length; x++)
      if (grid[y][x] === type) res.push({ x, y });
  return res;
}

function findOne(grid, type) { return findAll(grid, type)[0] || null; }

function isSolid(t) { return t === T.WALL || t === T.DARK_WALL; }
function isPassable(t) { return t === T.EMPTY || t === T.KEY || t === T.GOAL || t === T.ICE || t === T.MUSHROOM; }

// ================================================================
//  Stage loading
// ================================================================
function loadStage(idx) {
  const s = STAGES[idx];
  state.stage = idx;
  state.grid = deepCopy(s.grid);
  state.rows = state.grid.length;
  state.cols = state.grid[0].length;
  state.gravity = 'DOWN';
  state.hasKey = false;
  state.moves = 0;
  state.history = [];
  state.particles = [];
  state.fallAnimations = [];
  state.gameOver = false;
  state.won = false;

  const p = findOne(state.grid, T.PLAYER);
  state.playerPos = { x: p.x, y: p.y };

  state.enemyPos = { x: p.x, y: p.y };
  state.enemyHistory = [];

  fitCanvas();
  updateHUD();
  updateGravArrow(true);
}

function fitCanvas() {
  const maxW = window.innerWidth  - 32;
  const maxH = window.innerHeight - 80;
  const cellW = Math.floor(maxW / state.cols);
  const cellH = Math.floor(maxH / state.rows);
  state.cellSize = Math.max(32, Math.min(64, Math.min(cellW, cellH)));

  const w = state.cols * state.cellSize;
  const h = state.rows * state.cellSize;
  canvas.width  = w;
  canvas.height = h;
  state.offsetX = Math.floor((window.innerWidth  - w) / 2);
  state.offsetY = Math.floor((window.innerHeight - h) / 2);
  canvas.style.left = state.offsetX + 'px';
  canvas.style.top  = state.offsetY + 'px';
  canvas.style.position = 'fixed';
}

// ================================================================
//  Physics — apply gravity (fall all moveable tiles)
// ================================================================
function applyGravity(grid, grav) {
  const dir = DIRS[grav];
  let moved = true;
  let iterations = 0;
  while (moved && iterations < 200) {
    moved = false;
    iterations++;
    const moveables = findAll(grid, T.PLAYER).concat(findAll(grid, T.BOX));
    moveables.sort((a, b) => {
      const ax = dir.dx !== 0 ? a.x * dir.dx : a.y * dir.dy;
      const bx = dir.dx !== 0 ? b.x * dir.dx : b.y * dir.dy;
      return bx - ax;
    });

    for (const pos of moveables) {
      const type = grid[pos.y][pos.x];
      const nx = pos.x + dir.dx;
      const ny = pos.y + dir.dy;

      if (nx < 0 || nx >= grid[0].length || ny < 0 || ny >= grid.length) continue;

      const below = grid[ny][nx];

      const canFall = (below === T.EMPTY)
  　　　|| (below === T.ICE)
  　　　|| (below === T.KEY && type === T.PLAYER)
  　　　|| (below === T.GOAL && type === T.PLAYER && state.hasKey)
  　　　|| (below === T.MUSHROOM && type === T.PLAYER);
      
      if (canFall) {
        if (below === T.KEY && type === T.PLAYER) state.hasKey = true;
        grid[ny][nx] = type;
        grid[pos.y][pos.x] = T.EMPTY;
        if (type === T.PLAYER) state.playerPos = { x: nx, y: ny };
        moved = true;
      }

      if (below === T.SPIKE && type === T.PLAYER) {
        state.gameOver = true;
      }

      if (below === T.DOOR && type === T.PLAYER && state.hasKey) {
        grid[ny][nx] = T.PLAYER;
        grid[pos.y][pos.x] = T.EMPTY;
        state.playerPos = { x: nx, y: ny };
        state.won = true;
        moved = true;
      }

      if (below === T.GOAL && type === T.PLAYER && state.hasKey)  {
        state.won = true;
      }
    }
  }
  return grid;
}

// ================================================================
//  Input — change gravity direction
// ================================================================
function changeGravity(dir) {
  state.enemyHistory.push({ x: state.playerPos.x, y: state.playerPos.y });
  if (state.gameOver || state.won || !state.gameStarted) return;

  state.history.push({
    grid: deepCopy(state.grid),
    playerPos: { ...state.playerPos },
    gravity: state.gravity,
    hasKey: state.hasKey,
    moves: state.moves,
  });
  if (state.history.length > 50) state.history.shift();

  state.gravity = dir;
  state.moves++;

  const oldP = findOne(state.grid, T.PLAYER);
  if (oldP && (oldP.x !== state.playerPos.x || oldP.y !== state.playerPos.y)) {
    state.grid[oldP.y][oldP.x] = T.EMPTY;
    state.grid[state.playerPos.y][state.playerPos.x] = T.PLAYER;
  }

  state.grid = applyGravity(state.grid, dir);
  moveEnemy();
  updateHUD();
  updateGravArrow(false);
  spawnGravParticles(dir);

  if (state.gameOver) {
    state.shakeTime = 20;
    setTimeout(showDeath, 500);
  } else if (state.won || checkGoal()) {
    setTimeout(() => showVictory(), 600);
  }
}

function checkGoal() {
  const p = state.playerPos;
  const s = STAGES[state.stage];
  if (s.doorTarget) {
    return p.x === s.doorTarget.x && p.y === s.doorTarget.y;
  }
  const cell = state.grid[p.y][p.x];
　return (cell === T.GOAL && state.hasKey) || state.won;
}

function undoMove() {
  if (state.history.length === 0) return;
  const h = state.history.pop();
  state.grid = h.grid;
  state.playerPos = h.playerPos;
  state.gravity = h.gravity;
  state.hasKey = h.hasKey;
  state.moves = h.moves;
  state.gameOver = false;
  state.won = false;
  updateHUD();
  updateGravArrow(false);
}

// ================================================================
//  HUD & UI helpers
// ================================================================
function updateHUD() {
  document.getElementById('stageName').textContent =
    STAGES[state.stage].icon + ' ' + STAGES[state.stage].name;
  document.getElementById('moveCount').textContent = 'moves: ' + state.moves;
}

const ARROW_CHARS = { DOWN: '↓', UP: '↑', LEFT: '←', RIGHT: '→' };
const ARROW_ROTS  = { DOWN: 0, UP: 180, LEFT: 90, RIGHT: 270 };

function updateGravArrow(instant) {
  const el = document.getElementById('gravArrow');
  el.textContent = ARROW_CHARS[state.gravity];
  if (!instant) {
    el.style.transform = `rotate(${ARROW_ROTS[state.gravity]}deg) scale(1.4)`;
    setTimeout(() => { el.style.transform = `rotate(${ARROW_ROTS[state.gravity]}deg) scale(1)`; }, 200);
  }
}

function showOverlay(title, text, btn, cb) {
  const ov = document.getElementById('overlay');
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayText').textContent = text;
  const b = document.getElementById('overlayBtn');
  b.textContent = btn;
  b.onclick = () => { ov.classList.add('hidden'); cb(); };
  ov.classList.remove('hidden');
}

function showDeath() {
  showOverlay('💀 やられた…', 'トゲに触れてしまった。\nもう一度挑め。', 'もう一度', () => loadStage(state.stage));
}

async function showVictory() {
  const clearedStage = state.stage;
  const next = clearedStage + 1;

  if (typeof saveProgress === 'function') saveProgress(); // クラウドに進行状況を保存

  let rankText = '';
  if (typeof submitScore === 'function' && typeof getLeaderboard === 'function') {
    try {
      await submitScore(clearedStage, state.moves);
      const top = await getLeaderboard(clearedStage, 5);
      if (top.length > 0) {
        rankText = '\n\n🏆 このステージの上位記録\n' +
          top.map((r, i) => `${i + 1}位: ${r.moves}手`).join('\n');
      }
    } catch (e) {
      console.error('ランキング処理エラー:', e);
    }
  }

  if (next < STAGES.length) {
    showOverlay(
      '✨ 脱出成功！',
      STAGES[next].icon + ' 次のステージ\n「' + STAGES[next].name + '」へ' + rankText,
      '次へ進む',
      () => loadStage(next)
    );
  } else {
    showOverlay(
      '🎉 全ステージ制覇！',
      'すべての魔法の牢獄から脱出した！\n君こそ真の重力の使い手だ。' + rankText,
      '最初から',
      () => loadStage(0)
    );
  }
}

// ================================================================
//  Particle system
// ================================================================
function spawnGravParticles(dir) {
  const d = DIRS[dir];
  for (let i = 0; i < 18; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    state.particles.push({
      x: cx, y: cy,
      vx: d.dx * (2 + Math.random() * 4) + (Math.random() - 0.5) * 2,
      vy: d.dy * (2 + Math.random() * 4) + (Math.random() - 0.5) * 2,
      life: 1.0,
      decay: 0.04 + Math.random() * 0.04,
      size: 3 + Math.random() * 5,
      color: `hsl(${280 + Math.random() * 60}, 90%, 70%)`,
    });
  }
}

function spawnDeathParticles(x, y) {
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 5;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1.0, decay: 0.03, size: 4 + Math.random() * 6,
      color: `hsl(${Math.random() * 40}, 100%, 60%)`,
    });
  }
}

function updateParticles() {
  state.particles = state.particles.filter(p => {
    p.x += p.vx; p.y += p.vy;
    p.life -= p.decay;
    return p.life > 0;
  });
}

function moveEnemy(){ 
   if(state.enemyHistory.length < 2) return;  
   
   const pos = state.enemyHistory.shift();  
   
   state.enemyPos.x = pos.x;  
   state.enemyPos.y = pos.y;  
   
   if(    
    state.enemyPos.x === state.playerPos.x &&    
    state.enemyPos.y === state.playerPos.y  
  ){    
    state.gameOver = true;    
    setTimeout(showDeath,500);  
  }
}

function cloneGrid(grid){
  return grid.map(row => [...row]);
}

// ================================================================
//  Game loop
// ================================================================
function gameLoop() {
  requestAnimationFrame(gameLoop);

  if (state.gameStarted) {
    updateParticles();
    render();
  }

  const ts = document.getElementById('titleScreen');
  if (ts && !ts.classList.contains('fade-out') && ts.style.display !== 'none') {
    animateTitleParticles();
  }
}

// ================================================================
//  Input handling
// ================================================================
document.addEventListener('keydown', e => {
  if (!state.gameStarted) return;
  switch (e.key) {
    case 'ArrowDown':  case 's': case 'S': changeGravity('DOWN');  e.preventDefault(); break;
    case 'ArrowUp':    case 'w': case 'W': changeGravity('UP');    e.preventDefault(); break;
    case 'ArrowLeft':  case 'a': case 'A': changeGravity('LEFT');  e.preventDefault(); break;
    case 'ArrowRight': case 'd': case 'D': changeGravity('RIGHT'); e.preventDefault(); break;
    case 'r': case 'R': loadStage(state.stage); break;
    case 'z': case 'Z': undoMove(); break;
  }
});

// Touch/swipe support
let touchStart = null;
document.getElementById('gameCanvas').addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.getElementById('gameCanvas').addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (Math.max(adx, ady) < 20) return;
  if (adx > ady) changeGravity(dx > 0 ? 'RIGHT' : 'LEFT');
  else           changeGravity(dy > 0 ? 'DOWN'  : 'UP');
  touchStart = null;
}, { passive: true });

// ================================================================
//  Start
// ================================================================
if (typeof initTitleParticles === 'function') initTitleParticles();
gameLoop();

const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true; // 二重クリック防止
    const originalLabel = startBtn.textContent;
    startBtn.textContent = '読み込み中…';

    let startStage = 0;
    try {
      await initPlayer();
      const saved = await loadProgress();
      if (saved && typeof saved.stage === 'number' && saved.stage < STAGES.length) {
        startStage = saved.stage;
      }
    } catch (e) {
      console.error('認証/ロード処理でエラー:', e);
      // エラー時もオフラインでステージ1から開始できるようにする
    }

    startBtn.textContent = originalLabel;

    const ts = document.getElementById('titleScreen');
    if (ts) {
      ts.classList.add('fade-out');
      setTimeout(() => { ts.style.display = 'none'; }, 500);
    }

    loadStage(startStage);
    state.gameStarted = true;

    const s = STAGES[startStage];
    showOverlay(s.icon + ' ' + s.name, s.story, '出発！', () => {});
  });
} else {
  console.warn('startBtn not found — start button handler not attached');
}

window.addEventListener('resize', () => {
  if (state.gameStarted) fitCanvas();
});
