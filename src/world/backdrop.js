// 選單畫面的背景：黑暗中漂浮的灰塵與一盞忽明忽暗的燈
const motes = Array.from({ length: 70 }, () => ({
  x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4,
  vx: (Math.random() - 0.5) * 0.008, vy: -Math.random() * 0.012 - 0.003, a: Math.random() * 0.5 + 0.1,
}));
let t = 0;

export function drawBackdrop(ctx, w, h, dt) {
  t += dt;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#060406';
  ctx.fillRect(0, 0, w, h);

  const flick = 0.75 + Math.sin(t * 2.3) * 0.08 + (Math.random() < 0.03 ? -0.4 : 0);
  const g = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, Math.max(w, h) * 0.6);
  g.addColorStop(0, `rgba(120, 90, 60, ${0.18 * flick})`);
  g.addColorStop(0.5, `rgba(60, 20, 20, ${0.08 * flick})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  for (const m of motes) {
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
    if (m.x < 0) m.x = 1; if (m.x > 1) m.x = 0;
    ctx.fillStyle = `rgba(230, 210, 180, ${m.a * flick})`;
    ctx.beginPath();
    ctx.arc(m.x * w, m.y * h, m.r * (w / 800 + 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
}
