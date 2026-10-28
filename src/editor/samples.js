/* 程序化生成的示例图片 —— 编辑器空态演示用，零外部资源 */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 黄昏：渐变天空 + 落日 + 山峦剪影 */
function drawDusk(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.45, '#7597de');
  sky.addColorStop(0.72, '#f6a35c');
  sky.addColorStop(1, '#ffd39b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // 落日
  const sunY = h * 0.62;
  const glow = ctx.createRadialGradient(w * 0.68, sunY, 0, w * 0.68, sunY, h * 0.3);
  glow.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 200, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffedb8';
  ctx.beginPath();
  ctx.arc(w * 0.68, sunY, h * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // 山峦
  const layers = [
    { color: '#3d2b56', base: 0.72, amp: 0.1, peaks: 4 },
    { color: '#241a38', base: 0.82, amp: 0.07, peaks: 6 },
    { color: '#14101f', base: 0.92, amp: 0.05, peaks: 8 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= layer.peaks; i++) {
      const x = (w * i) / layer.peaks;
      const y = h * layer.base - Math.sin(i * 2.7 + layer.base * 9) * h * layer.amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  // 飞鸟
  ctx.strokeStyle = 'rgba(20, 16, 31, 0.85)';
  ctx.lineWidth = 2;
  for (const [bx, by, s] of [[0.3, 0.3, 10], [0.36, 0.24, 7], [0.42, 0.33, 12]]) {
    const x = w * bx;
    const y = h * by;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s / 2, y - s / 2, x, y);
    ctx.quadraticCurveTo(x + s / 2, y - s / 2, x + s, y);
    ctx.stroke();
  }
}

/** 霓虹：暗夜 + 透视网格 + 霓虹圆 */
function drawNeon(ctx, w, h) {
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, w, h);

  const horizon = h * 0.58;

  // 天空霓虹圆
  const circles = [
    { x: 0.5, y: 0.3, r: 0.16, color: 'rgba(246, 84, 174, 0.85)' },
    { x: 0.5, y: 0.3, r: 0.22, color: 'rgba(246, 84, 174, 0.25)' },
    { x: 0.26, y: 0.2, r: 0.05, color: 'rgba(84, 246, 214, 0.9)' },
    { x: 0.78, y: 0.26, r: 0.035, color: 'rgba(120, 160, 255, 0.9)' },
  ];
  for (const c of circles) {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(w * c.x, h * c.y, h * c.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 地面透视网格
  ctx.strokeStyle = 'rgba(84, 200, 246, 0.5)';
  ctx.lineWidth = 1.5;
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + i * w * 0.03, horizon);
    ctx.lineTo(w * 0.5 + i * w * 0.28, h);
    ctx.stroke();
  }
  let y = horizon;
  let gap = 8;
  while (y < h) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    y += gap;
    gap *= 1.35;
  }

  // 霓虹横条
  ctx.fillStyle = 'rgba(246, 84, 174, 0.9)';
  ctx.fillRect(w * 0.12, h * 0.44, w * 0.2, 4);
  ctx.fillStyle = 'rgba(84, 246, 214, 0.9)';
  ctx.fillRect(w * 0.66, h * 0.4, w * 0.24, 4);
  ctx.fillStyle = 'rgba(120, 160, 255, 0.9)';
  ctx.fillRect(w * 0.4, h * 0.14, w * 0.16, 3);

  // 地平线辉光
  const hg = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 30);
  hg.addColorStop(0, 'rgba(84, 200, 246, 0)');
  hg.addColorStop(0.5, 'rgba(84, 200, 246, 0.35)');
  hg.addColorStop(1, 'rgba(84, 200, 246, 0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, horizon - 30, w, 60);
}

/** 静物：高色彩方差 + 硬边缘，适合检验效果 */
function drawStill(ctx, w, h) {
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, w, h);

  // 棋盘底
  const cell = w / 16;
  for (let r = 0; r < h / cell; r++) {
    for (let c = 0; c < 16; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }

  // 半透明圆
  const dots = [
    { x: 0.3, y: 0.38, r: 0.2, color: 'rgba(255, 89, 94, 0.85)' },
    { x: 0.52, y: 0.3, r: 0.16, color: 'rgba(255, 202, 58, 0.85)' },
    { x: 0.68, y: 0.46, r: 0.22, color: 'rgba(138, 201, 38, 0.8)' },
    { x: 0.46, y: 0.62, r: 0.18, color: 'rgba(25, 130, 196, 0.85)' },
    { x: 0.72, y: 0.72, r: 0.13, color: 'rgba(106, 76, 147, 0.85)' },
  ];
  for (const d of dots) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(w * d.x, h * d.y, h * d.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 斜条纹
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#f4f4f6';
  ctx.lineWidth = 6;
  for (let i = -h; i < w + h; i += 36) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  ctx.restore();

  // 硬边色块
  ctx.fillStyle = '#f4f4f6';
  ctx.fillRect(w * 0.08, h * 0.78, w * 0.16, h * 0.1);
  ctx.fillStyle = '#111112';
  ctx.fillRect(w * 0.12, h * 0.8, w * 0.08, h * 0.06);
}

export const SAMPLES = [
  { id: 'dusk', name: '黄昏', draw: drawDusk },
  { id: 'neon', name: '霓虹', draw: drawNeon },
  { id: 'still', name: '静物', draw: drawStill },
];

/** 生成示例图画布（1200×800） */
export function renderSample(sample, w = 1200, h = 800) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  sample.draw(ctx, w, h);
  return canvas;
}
