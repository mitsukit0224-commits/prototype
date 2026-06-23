// ================================================================
//  renderer.js — 描画担当（Canvas描画・パーティクル・タイトル演出）
//  依存: levels.js (T, DIRS, STAGES)
//        logic.js  (state)
// ================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── アニメーション用タイマー ──
let time = 0;
let playerRotation = 0;

// ── セル色定義 ──
const CELL_COLORS = {
  [T.WALL]:       { fill: '#2d4a1e', stroke: '#4a7a30', glow: null },
  [T.DARK_WALL]:  { fill: '#1a0d2e', stroke: '#5a3a7e', glow: '#7c3aed' },
  [T.KEY]:        { fill: '#facc15', stroke: '#fbbf24', glow: '#fde68a' },
  [T.DOOR]:       { fill: '#92400e', stroke: '#b45309', glow: '#fbbf24' },
  [T.SPIKE]:      { fill: '#dc2626', stroke: '#ef4444', glow: '#fca5a5' },
  [T.ICE]:        { fill: '#bae6fd', stroke: '#7dd3fc', glow: '#e0f2fe' },
  [T.GOAL]:       { fill: '#16a34a', stroke: '#4ade80', glow: '#86efac' },
  [T.MUSHROOM]:   { fill: '#dc2626', stroke: '#ef4444', glow: '#fca5a5' },
};

// ================================================================
//  Helper: roundRect
// ================================================================
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ================================================================
//  drawCell — 各タイルの描画
// ================================================================
function drawCell(x, y, type, cs) {
  const px = x * cs;
  const py = y * cs;
  const s = STAGES[state.stage];
  const pal = s.palette;

  if (type === T.EMPTY) return;

  ctx.save();
  ctx.translate(px, py);

  switch (type) {
    case T.WALL:
    case T.DARK_WALL: {
      drawWall(type, cs);
      break;
    }

    case T.BOX: {
      const gb = ctx.createLinearGradient(0, 0, cs, cs);
      gb.addColorStop(0, '#92400e');
      gb.addColorStop(1, '#451a03');
      ctx.fillStyle = gb;
      roundRect(ctx, 2, 2, cs - 4, cs - 4, 5);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 2, 2, cs - 4, cs - 4, 5);
      ctx.stroke();

      ctx.strokeStyle = '#fbbf2466';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cs * 0.5, 4); ctx.lineTo(cs * 0.5, cs - 4);
      ctx.moveTo(4, cs * 0.5); ctx.lineTo(cs - 4, cs * 0.5);
      ctx.stroke();

      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#fbbf2444';
      roundRect(ctx, 3, 3, cs - 6, cs - 6, 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }

    case T.KEY: {
      const pulse = Math.sin(time * 0.1) * 0.15 + 1;
      ctx.scale(pulse, pulse);
      ctx.translate(cs * (1 - pulse) * 0.5 / pulse, cs * (1 - pulse) * 0.5 / pulse);

      ctx.shadowColor = '#fde68a';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#facc15';
      const kx = cs * 0.4, ky = cs * 0.45, kr = cs * 0.18;
      ctx.beginPath(); ctx.arc(kx, ky, kr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath(); ctx.arc(kx, ky, kr * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(kx + kr * 0.9, ky - kr * 0.25, cs * 0.35, kr * 0.5);
      ctx.fillRect(kx + kr * 0.9 + cs * 0.15, ky + kr * 0.25, cs * 0.08, cs * 0.12);
      ctx.fillRect(kx + kr * 0.9 + cs * 0.25, ky + kr * 0.25, cs * 0.08, cs * 0.08);
      ctx.shadowBlur = 0;
      break;
    }

    case T.DOOR: {
      const gd = ctx.createLinearGradient(0, 0, 0, cs);
      gd.addColorStop(0, '#b45309');
      gd.addColorStop(1, '#451a03');
      ctx.fillStyle = state.hasKey ? '#4ade80' : gd;
      roundRect(ctx, 3, 1, cs - 6, cs - 2, 4);
      ctx.fill();
      ctx.strokeStyle = state.hasKey ? '#86efac' : '#fbbf24';
      ctx.lineWidth = 2;
      roundRect(ctx, 3, 1, cs - 6, cs - 2, 4);
      ctx.stroke();

      if (!state.hasKey) {
        ctx.fillStyle = '#fbbf24';
        const lx = cs * 0.5, ly = cs * 0.52, lw = cs * 0.22, lh = cs * 0.2;
        ctx.fillRect(lx - lw * 0.5, ly, lw, lh);
        ctx.beginPath();
        ctx.arc(lx, ly, lw * 0.5, Math.PI, 0);
        ctx.lineWidth = cs * 0.06;
        ctx.strokeStyle = '#fbbf24';
        ctx.stroke();
      } else {
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${cs * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', cs * 0.5, cs * 0.5);
        ctx.shadowBlur = 0;
      }
      break;
    }

    case T.SPIKE: {
      const count = 3;
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#fca5a5';
      ctx.shadowBlur = 8;
      for (let i = 0; i < count; i++) {
        const bx = cs * (i + 0.5) / count;
        ctx.beginPath();
        ctx.moveTo(bx - cs * 0.12, cs - 2);
        ctx.lineTo(bx, cs * 0.15);
        ctx.lineTo(bx + cs * 0.12, cs - 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      break;
    }

    case T.ICE: {
      const gi = ctx.createLinearGradient(0, 0, cs, cs);
      gi.addColorStop(0, '#e0f2fe');
      gi.addColorStop(1, '#7dd3fc');
      ctx.fillStyle = gi;
      ctx.fillRect(0, cs - 6, cs, 6);
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, cs - 6, cs, 6);
      ctx.fillStyle = '#ffffff88';
      ctx.fillRect(cs * 0.1, cs - 5, cs * 0.2, 2);
      break;
    }

    case T.GOAL: {
      const pulse2 = Math.sin(time * 0.08) * 0.1 + 1;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 20 * pulse2;
      const gg = ctx.createRadialGradient(cs * 0.5, cs * 0.5, 2, cs * 0.5, cs * 0.5, cs * 0.5);
      gg.addColorStop(0, pal.accent + 'ff');
      gg.addColorStop(0.6, pal.glow + '88');
      gg.addColorStop(1, pal.dark + '00');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(cs * 0.5, cs * 0.5, cs * 0.42 * pulse2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = `${cs * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', cs * 0.5, cs * 0.5);
      break;
    }

    case T.PLAYER: {
      drawPlayer(cs);
      break;
    }
  }

  ctx.restore();
}

// ================================================================
//  drawPlayer — プレイヤーキャラクター描画
// ================================================================
function drawPlayer(cs) {
  const bob = Math.sin(time * 0.12) * 2;
  const s = STAGES[state.stage];
  const pal = s.palette;

  ctx.save();

  // プレイヤー中心を回転軸にする
  ctx.translate(cs / 2, cs / 2);

  const targetRot = {
    DOWN: 0,
    RIGHT: -Math.PI / 2,
    UP: Math.PI,
    LEFT: Math.PI / 2
  }[state.gravity];

  playerRotation += (targetRot - playerRotation) * 0.15;

  ctx.rotate(playerRotation);
  ctx.translate(-cs / 2, -cs / 2);

  ctx.shadowColor = pal.glow;
  ctx.shadowBlur = 16;

  // Body (cape)
  const gc = ctx.createLinearGradient(0, 0, 0, cs);
  gc.addColorStop(0, '#dc2626');
  gc.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = gc;
  roundRect(ctx, cs * 0.22, cs * 0.28 + bob, cs * 0.56, cs * 0.52, 8);
  ctx.fill();

  // Face
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(cs * 0.5, cs * 0.27 + bob, cs * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#1e0d2e';
  ctx.beginPath();
  ctx.arc(cs * 0.42, cs * 0.25 + bob, cs * 0.04, 0, Math.PI * 2);
  ctx.arc(cs * 0.58, cs * 0.25 + bob, cs * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Hat
  ctx.fillStyle = '#1e0d2e';
  ctx.fillRect(cs * 0.3, cs * 0.09 + bob, cs * 0.4, cs * 0.05);
  ctx.beginPath();
  ctx.moveTo(cs * 0.38, cs * 0.09 + bob);
  ctx.lineTo(cs * 0.5, cs * -0.04 + bob);
  ctx.lineTo(cs * 0.62, cs * 0.09 + bob);
  ctx.closePath();
  ctx.fill();

  // Key indicator
  if (state.hasKey) {
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    ctx.font = `${cs * 0.25}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🗝️', cs * 0.82, cs * 0.2 + bob);
    ctx.shadowBlur = 0;
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ================================================================
//  render — メインレンダリングループ
// ================================================================
function render() {
  const cs = state.cellSize;
  const s = STAGES[state.stage];
  const pal = s.palette;

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = pal.wall + '22';
  ctx.lineWidth = 0.5;
  for (let y = 0; y < state.rows; y++)
    for (let x = 0; x < state.cols; x++) {
      ctx.strokeRect(x * cs, y * cs, cs, cs);
    }

  // Camera shake
  let shakeX = 0, shakeY = 0;
  if (state.shakeTime > 0) {
    shakeX = (Math.random() - 0.5) * 8 * (state.shakeTime / 20);
    shakeY = (Math.random() - 0.5) * 8 * (state.shakeTime / 20);
    state.shakeTime--;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const type = state.grid[y][x];
      if (type !== T.EMPTY) drawCell(x, y, type, cs);
    }
  }

  ctx.restore();

  // Particles
  for (const p of state.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  // Stage clear flash
  if (state.won) {
    const alpha = Math.min(0.6, (time % 30) / 30 * 0.6);
    ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  time++;
}

// ================================================================
//  Title screen particles
// ================================================================
const titleParticles = [];

function initTitleParticles() {
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = 0; i < 60; i++) {
    titleParticles.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.3 + Math.random() * 0.5),
      size: 1 + Math.random() * 3,
      opacity: 0.3 + Math.random() * 0.5,
      hue: 260 + Math.random() * 60,
    });
  }
}

function animateTitleParticles() {
  const div = document.getElementById('titleParticles');
  let c2 = div.__canvas;
  if (!c2) {
    c2 = document.createElement('canvas');
    c2.width = window.innerWidth; c2.height = window.innerHeight;
    c2.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    div.parentNode.insertBefore(c2, div);
    div.__canvas = c2;
  }
  const ctx2 = c2.getContext('2d');
  ctx2.clearRect(0, 0, c2.width, c2.height);

  for (const p of titleParticles) {
    p.x += p.vx; p.y += p.vy;
    if (p.y < -10) { p.y = c2.height + 10; p.x = Math.random() * c2.width; }
    if (p.x < 0) p.x = c2.width;
    if (p.x > c2.width) p.x = 0;

    ctx2.globalAlpha = p.opacity;
    ctx2.shadowColor = `hsl(${p.hue}, 80%, 70%)`;
    ctx2.shadowBlur = 6;
    ctx2.fillStyle = `hsl(${p.hue}, 80%, 75%)`;
    ctx2.beginPath();
    ctx2.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx2.fill();
  }
  ctx2.globalAlpha = 1;
  ctx2.shadowBlur = 0;
}

function drawWall(type, cs) {
  const dark = (type === T.DARK_WALL);

  switch(state.stage) {

    case 0:
      drawForestWall(cs, dark);
      break;

    case 1:
      drawTowerWall(cs, dark);
      break;

    case 2:
      drawCandyWall(cs, dark);
      break;

    case 3:
      drawPalaceWall(cs, dark);
      break;

    case 4:
      drawIceWall(cs, dark);
      break;
  }
}

function drawForestWall(cs, dark){

  // 木材ベース
  const g = ctx.createLinearGradient(0,0,0,cs);

  if(dark){
    g.addColorStop(0,"#5a3d24");
    g.addColorStop(1,"#352012");
  }else{
    g.addColorStop(0,"#8c6239");
    g.addColorStop(1,"#5f3d22");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // ブロック枠
  ctx.strokeStyle = dark ? "#26160d" : "#3f2614";
  ctx.lineWidth = 2;
  ctx.strokeRect(0,0,cs,cs);

  // 上の苔
  ctx.fillStyle = dark ? "#3bbf6b" : "#67f29c";

  const moss = [
    [0.05,0.00,0.09],
    [0.18,0.02,0.08],
    [0.32,0.01,0.10],
    [0.46,0.00,0.08],
    [0.60,0.02,0.09],
    [0.75,0.00,0.10],
    [0.92,0.01,0.08]
  ];

  moss.forEach(m=>{
    ctx.beginPath();
    ctx.arc(
      cs*m[0],
      cs*m[1],
      cs*m[2],
      Math.PI,
      0
    );
    ctx.fill();
  });

  // 葉っぱ（固定配置）
  const leafColors = dark
    ? ["#1e4d22","#27682d","#1a3d1d"]
    : ["#5cbf41","#4faa34","#73d655"];

  const leaves = [
    [0.08,0.05,0],
    [0.18,0.02,1],
    [0.28,0.07,2],
    [0.38,0.03,0],
    [0.48,0.06,1],
    [0.58,0.02,2],
    [0.68,0.05,0],
    [0.78,0.03,1],
    [0.88,0.06,2]
  ];

  leaves.forEach(l=>{
    ctx.fillStyle = leafColors[l[2]];

    ctx.beginPath();
    ctx.arc(
      cs*l[0],
      cs*l[1],
      cs*0.09,
      0,
      Math.PI*2
    );
    ctx.fill();
  });

  // ツタ（固定）
  ctx.strokeStyle =
    dark ? "#2dd47a" : "#52ff9f";

  ctx.lineWidth = 2;

  const vx = cs * 0.78;

  ctx.beginPath();
  ctx.moveTo(vx,0);

  ctx.bezierCurveTo(
    vx+2,
    cs*0.25,
    vx-3,
    cs*0.55,
    vx,
    cs
  );

  ctx.stroke();

  // ツタの葉
  const vineLeaves = [
    [0.18,-3],
    [0.32, 3],
    [0.50,-3],
    [0.68, 3],
    [0.84,-3]
  ];

  vineLeaves.forEach(v=>{

    const y = cs*v[0];

    ctx.fillStyle =
      dark ? "#6affb0" : "#a5ffd1";

    ctx.beginPath();
    ctx.arc(vx+v[1],y,2,0,Math.PI*2);
    ctx.fill();

  });

  // 木目（固定）
  ctx.strokeStyle = dark ? "#2d180d" : "#4b2e18";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(cs*0.20,cs*0.35);
  ctx.lineTo(cs*0.42,cs*0.42);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cs*0.55,cs*0.62);
  ctx.lineTo(cs*0.78,cs*0.55);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cs*0.25,cs*0.75);
  ctx.lineTo(cs*0.45,cs*0.80);
  ctx.stroke();
}

function drawTowerWall(cs, dark){

  // 石壁ベース
  const g = ctx.createLinearGradient(0,0,0,cs);

  if(dark){
    g.addColorStop(0,"#4b3a68");
    g.addColorStop(1,"#241933");
  }else{
    g.addColorStop(0,"#9f95b8");
    g.addColorStop(1,"#6f6488");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // レンガ
  const bw = cs / 2;
  const bh = cs / 3;

  ctx.strokeStyle = dark ? "#1a1324" : "#4c445f";
  ctx.lineWidth = 2;

  for(let row=0; row<3; row++){

    const offset = (row % 2) * bw * 0.5;

    for(let col=-1; col<3; col++){

      ctx.strokeRect(
        col*bw + offset,
        row*bh,
        bw,
        bh
      );
    }
  }

  // 石の陰影
  ctx.fillStyle = dark
    ? "#ffffff08"
    : "#ffffff18";

  ctx.fillRect(
    2,
    2,
    cs-4,
    cs*0.18
  );

  // ひび割れ
  ctx.strokeStyle =
    dark ? "#120d1b" : "#5f566f";

  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(cs*0.30, cs*0.15);
  ctx.lineTo(cs*0.35, cs*0.30);
  ctx.lineTo(cs*0.28, cs*0.42);
  ctx.lineTo(cs*0.36, cs*0.55);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cs*0.72, cs*0.52);
  ctx.lineTo(cs*0.60, cs*0.65);
  ctx.lineTo(cs*0.68, cs*0.82);
  ctx.stroke();

  // 欠け
  ctx.fillStyle =
    dark ? "#1d1328" : "#5e5570";

  ctx.beginPath();
  ctx.moveTo(cs*0.05, cs*0.20);
  ctx.lineTo(cs*0.12, cs*0.26);
  ctx.lineTo(cs*0.05, cs*0.34);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cs*0.95, cs*0.65);
  ctx.lineTo(cs*0.86, cs*0.72);
  ctx.lineTo(cs*0.95, cs*0.80);
  ctx.fill();

  // 魔法の光
  ctx.shadowColor = "#c084fc";
  ctx.shadowBlur = 10;

  ctx.fillStyle = "#c084fc88";

  ctx.beginPath();
  ctx.arc(
    cs*0.20,
    cs*0.20,
    cs*0.04,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    cs*0.80,
    cs*0.75,
    cs*0.03,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.shadowBlur = 0;
}

// ===== 背景描画 =====

function drawBackground(){

  switch(state.stage){

    case 0:
      drawForestBackground();
      break;

    case 1:
      drawTowerBackground();
      break;

    case 2:
      drawCandyBackground();
      break;

    case 3:
      drawPalaceBackground();
      break;

    case 4:
      drawIceBackground();
      break;
  }
}


// ===== Stage1 =====

function drawForestBackground(){

  const g = ctx.createLinearGradient(
    0,0,
    0,canvas.height
  );

  g.addColorStop(0,"#08120a");
  g.addColorStop(1,"#18361a");

  ctx.fillStyle = g;

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.fillStyle = "#0f250f";

  for(let i=0;i<15;i++){

    const x = i * 80;

    ctx.beginPath();

    ctx.moveTo(x,canvas.height);
    ctx.lineTo(x+20,canvas.height-80);
    ctx.lineTo(x+40,canvas.height);

    ctx.fill();
  }
}
function drawCandyWall(cs, dark){

  // クッキー生地
  const g = ctx.createLinearGradient(0,0,0,cs);

  if(dark){
    g.addColorStop(0,"#8b5a2b");
    g.addColorStop(1,"#4a2a10");
  }else{
    g.addColorStop(0,"#d8a56a");
    g.addColorStop(1,"#b97a3d");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // クッキー枠
  ctx.strokeStyle =
    dark ? "#3b1f0c" : "#8b4513";

  ctx.lineWidth = 2;
  ctx.strokeRect(0,0,cs,cs);

  // アイシング
  ctx.fillStyle =
    dark ? "#ffe8f5" : "#fff8fc";

  ctx.beginPath();

  ctx.moveTo(0,0);

  ctx.bezierCurveTo(
    cs*0.15, cs*0.08,
    cs*0.30,-cs*0.03,
    cs*0.45, cs*0.08
  );

  ctx.bezierCurveTo(
    cs*0.60, cs*0.18,
    cs*0.75,-cs*0.02,
    cs, cs*0.08
  );

  ctx.lineTo(cs,0);
  ctx.closePath();
  ctx.fill();

  // キャンディ固定配置
  const candies = [
    [0.18,0.30,"#ff4fa3"],
    [0.45,0.22,"#60a5fa"],
    [0.75,0.32,"#facc15"],
    [0.28,0.68,"#fb7185"],
    [0.65,0.74,"#4ade80"]
  ];

  candies.forEach(c=>{

    ctx.fillStyle = c[2];

    ctx.beginPath();
    ctx.arc(
      cs*c[0],
      cs*c[1],
      cs*0.08,
      0,
      Math.PI*2
    );
    ctx.fill();

    // キャンディ包装
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.moveTo(cs*c[0]-8,cs*c[1]);
    ctx.lineTo(cs*c[0]-14,cs*c[1]-4);
    ctx.lineTo(cs*c[0]-14,cs*c[1]+4);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cs*c[0]+8,cs*c[1]);
    ctx.lineTo(cs*c[0]+14,cs*c[1]-4);
    ctx.lineTo(cs*c[0]+14,cs*c[1]+4);
    ctx.fill();
  });

  // チョコチップ
  const chips = [
    [0.12,0.15],
    [0.35,0.45],
    [0.55,0.55],
    [0.82,0.18],
    [0.72,0.86],
    [0.20,0.82]
  ];

  ctx.fillStyle = "#4a2511";

  chips.forEach(ch=>{

    ctx.beginPath();
    ctx.arc(
      cs*ch[0],
      cs*ch[1],
      cs*0.03,
      0,
      Math.PI*2
    );
    ctx.fill();
  });

  // ペパーミント
  ctx.save();

  ctx.translate(
    cs*0.80,
    cs*0.80
  );

  ctx.beginPath();
  ctx.arc(
    0,
    0,
    cs*0.10,
    0,
    Math.PI*2
  );

  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.strokeStyle = "#ff4f7d";
  ctx.lineWidth = 2;

  for(let i=0;i<6;i++){

    ctx.beginPath();

    ctx.moveTo(0,0);

    ctx.lineTo(
      Math.cos(i*Math.PI/3)*cs*0.10,
      Math.sin(i*Math.PI/3)*cs*0.10
    );

    ctx.stroke();
  }

  ctx.restore();
}

function drawPalaceWall(cs, dark){

  // 大理石ベース
  const g = ctx.createLinearGradient(0,0,cs,cs);

  if(dark){
    g.addColorStop(0,"#6a738c");
    g.addColorStop(1,"#3a4154");
  }else{
    g.addColorStop(0,"#f3f6ff");
    g.addColorStop(1,"#d8ddea");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // 外枠（金装飾）
  ctx.strokeStyle =
    dark ? "#b8860b" : "#ffd700";

  ctx.lineWidth = 3;

  ctx.strokeRect(
    2,
    2,
    cs-4,
    cs-4
  );

  // 内枠
  ctx.lineWidth = 1.5;

  ctx.strokeRect(
    6,
    6,
    cs-12,
    cs-12
  );

  // ステンドグラス中央
  const glass = ctx.createLinearGradient(
    0,
    0,
    0,
    cs
  );

  glass.addColorStop(0,"#93c5fd");
  glass.addColorStop(1,"#2563eb");

  ctx.fillStyle = glass;

  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.18);
  ctx.lineTo(cs*0.72, cs*0.50);
  ctx.lineTo(cs*0.50, cs*0.82);
  ctx.lineTo(cs*0.28, cs*0.50);

  ctx.closePath();
  ctx.fill();

  // ステンドグラス枠
  ctx.strokeStyle =
    dark ? "#c9a227" : "#facc15";

  ctx.lineWidth = 2;

  ctx.stroke();

  // 十字模様
  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.22);
  ctx.lineTo(cs*0.50, cs*0.78);

  ctx.moveTo(cs*0.34, cs*0.50);
  ctx.lineTo(cs*0.66, cs*0.50);

  ctx.stroke();

  // 大理石の筋（固定）
  ctx.strokeStyle =
    dark ? "#8b93a8" : "#c7cfdd";

  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(cs*0.15, cs*0.20);
  ctx.lineTo(cs*0.30, cs*0.35);
  ctx.lineTo(cs*0.22, cs*0.55);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cs*0.70, cs*0.10);
  ctx.lineTo(cs*0.80, cs*0.35);
  ctx.lineTo(cs*0.72, cs*0.60);
  ctx.stroke();

  // 王冠モチーフ
  ctx.fillStyle =
    dark ? "#d4af37" : "#ffd700";

  ctx.beginPath();

  ctx.moveTo(cs*0.35, cs*0.12);
  ctx.lineTo(cs*0.42, cs*0.04);
  ctx.lineTo(cs*0.50, cs*0.12);
  ctx.lineTo(cs*0.58, cs*0.04);
  ctx.lineTo(cs*0.65, cs*0.12);

  ctx.closePath();
  ctx.fill();

  // 宝石
  ctx.fillStyle = "#60a5fa";

  ctx.beginPath();
  ctx.arc(
    cs*0.50,
    cs*0.09,
    cs*0.03,
    0,
    Math.PI*2
  );
  ctx.fill();
}

function drawIceWall(cs, dark){

  // 氷のグラデーション
  const g = ctx.createLinearGradient(
    0,
    0,
    cs,
    cs
  );

  if(dark){
    g.addColorStop(0,"#3b82f6");
    g.addColorStop(1,"#0f172a");
  }else{
    g.addColorStop(0,"#e0f2fe");
    g.addColorStop(1,"#7dd3fc");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0,0,cs,cs);

  // 外枠
  ctx.strokeStyle =
    dark ? "#60a5fa" : "#ffffff";

  ctx.lineWidth = 2;

  ctx.strokeRect(
    0,
    0,
    cs,
    cs
  );

  // 氷の反射
  ctx.fillStyle =
    dark ? "#ffffff10" : "#ffffff40";

  ctx.beginPath();

  ctx.moveTo(0,0);
  ctx.lineTo(cs*0.7,0);
  ctx.lineTo(0,cs*0.7);

  ctx.closePath();
  ctx.fill();

  // 氷のひび
  ctx.strokeStyle =
    dark ? "#93c5fd" : "#ffffff";

  ctx.lineWidth = 1.2;

  ctx.beginPath();

  ctx.moveTo(cs*0.20, cs*0.15);
  ctx.lineTo(cs*0.35, cs*0.30);
  ctx.lineTo(cs*0.28, cs*0.45);

  ctx.stroke();

  ctx.beginPath();

  ctx.moveTo(cs*0.72, cs*0.25);
  ctx.lineTo(cs*0.60, cs*0.42);
  ctx.lineTo(cs*0.78, cs*0.62);

  ctx.stroke();

  // 氷のステンドグラス

  const glass = ctx.createLinearGradient(
    0,
    cs*0.25,
    0,
    cs*0.75
  );

  glass.addColorStop(0,"#ffffff");
  glass.addColorStop(1,"#93c5fd");

  ctx.fillStyle = glass;

  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.18);
  ctx.lineTo(cs*0.72, cs*0.50);
  ctx.lineTo(cs*0.50, cs*0.82);
  ctx.lineTo(cs*0.28, cs*0.50);

  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;

  ctx.stroke();

  // 窓の十字

  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.22);
  ctx.lineTo(cs*0.50, cs*0.78);

  ctx.moveTo(cs*0.34, cs*0.50);
  ctx.lineTo(cs*0.66, cs*0.50);

  ctx.stroke();

  // 氷の宝石
  ctx.fillStyle =
    dark ? "#bfdbfe" : "#ffffff";

  ctx.beginPath();

  ctx.moveTo(cs*0.50, cs*0.15);
  ctx.lineTo(cs*0.58, cs*0.25);
  ctx.lineTo(cs*0.50, cs*0.35);
  ctx.lineTo(cs*0.42, cs*0.25);

  ctx.closePath();
  ctx.fill();

  // 氷の尖塔
  ctx.fillStyle = "#e0f2fe";

  ctx.beginPath();

  ctx.moveTo(cs*0.15, cs*0.20);
  ctx.lineTo(cs*0.22, cs*0.05);
  ctx.lineTo(cs*0.29, cs*0.20);

  ctx.closePath();
  ctx.fill();

  ctx.beginPath();

  ctx.moveTo(cs*0.85, cs*0.20);
  ctx.lineTo(cs*0.78, cs*0.05);
  ctx.lineTo(cs*0.71, cs*0.20);

  ctx.closePath();
  ctx.fill();

  // 魔法の輝き
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 12;

  ctx.fillStyle = "#ffffffaa";

  ctx.beginPath();
  ctx.arc(
    cs*0.18,
    cs*0.18,
    cs*0.03,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    cs*0.82,
    cs*0.82,
    cs*0.025,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.shadowBlur = 0;
}
