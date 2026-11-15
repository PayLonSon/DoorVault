import { sfx, setPresence } from '../core/audio.js';

// 五種怪物行為。故事裡用 monster.behavior 指定要哪一種。
// 每種行為提供：init、update、onItem（道具效果）、canHit、onHit、draw（黑暗下）、drawAbove（黑暗上，例如發光的眼睛）
// 可選：onTargetProgress（玩家正在完成目標時）

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// 搖搖晃晃地朝目標移動
function steer(sc, m, tx, ty, speed, dt, wobble = 0.5, agility = 4) {
  const dx = tx - m.x, dy = ty - m.y, l = Math.hypot(dx, dy) || 1;
  const wob = Math.sin(sc.t * 7 + (m.seed || 0)) * wobble;
  const wx = (dx / l - (dy / l) * wob) * speed, wy = (dy / l + (dx / l) * wob) * speed;
  const k = Math.min(1, dt * agility);
  m.vx += (wx - m.vx) * k;
  m.vy += (wy - m.vy) * k;
  if (l < 4 && speed < 1) { m.vx = 0; m.vy = 0; }
  m.x = clamp(m.x + m.vx * dt, 40, sc.map.width - 40);
  m.y = clamp(m.y + m.vy * dt, 40, sc.map.height - 40);
}

function away(sc, m, speed, dt) {
  const p = sc.player, ax = m.x - p.x, ay = m.y - p.y, l = Math.hypot(ax, ay) || 1;
  steer(sc, m, m.x + (ax / l) * 120, m.y + (ay / l) * 120, speed, dt, 0.3);
}

function randomPoint(sc) {
  const map = sc.map;
  return { x: 80 + Math.random() * (map.width - 160), y: 80 + Math.random() * (map.height - 160) };
}

function glowEyes(ctx, x, y, ang, color, alpha, spread = 4, r = 9) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(s * spread, -10, 0, s * spread, -10, r);
    g.addColorStop(0, `rgba(${color},${alpha})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s * spread, -10, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,235,220,${alpha})`;
    ctx.beginPath(); ctx.arc(s * spread, -10, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 預設的道具反應：有效就逃開，反效果就暴怒
function defaultOnItem(sc, m, effect, d) {
  if (effect === 'effective') {
    if (d > 280) return 'far';
    m.state = 'flee'; m.timer = 4.5;
    return 'effective';
  }
  if (effect === 'provoked') { m.state = 'enraged'; m.timer = 5; sfx.screech(); return 'provoked'; }
  return d < 400 ? 'none' : 'nothing';
}

// ================= 飛蛾撲火：繞著燈飛，被光吸引 =================
const moth = {
  init(sc, m) {
    Object.assign(m, { state: 'hover', angle: 0, loseT: 0, flap: 0 });
    setPresence(380, 21);
  },
  update(sc, m, dt) {
    const p = sc.player, cfg = sc.cfg, lamp = sc.theme.lamp || { x: sc.map.width / 2, y: sc.map.height / 2 };
    const d = dist(m, p);
    const chase = cfg.chaseSpeed + sc.done * cfg.speedPerObjective;
    m.flap += dt * (m.state === 'enraged' ? 34 : 22);
    switch (m.state) {
      case 'hover':
        m.angle += dt * 0.9;
        steer(sc, m, lamp.x + Math.cos(m.angle) * cfg.hoverRadius, lamp.y + Math.sin(m.angle * 1.3) * cfg.hoverRadius * 0.6, 85, dt);
        if (d < cfg.detectRadius || sc.lightProvokes) { m.state = 'chase'; m.loseT = 0; sfx.screech(); }
        break;
      case 'chase':
        steer(sc, m, p.x, p.y, sc.lightProvokes ? Math.max(chase, 150) : chase, dt);
        if (d > cfg.loseRadius && !sc.lightProvokes) { m.loseT += dt; if (m.loseT > 2) m.state = 'hover'; } else m.loseT = 0;
        break;
      case 'enraged':
        steer(sc, m, p.x, p.y, cfg.enragedSpeed, dt);
        if ((m.timer -= dt) <= 0) { m.state = 'chase'; m.loseT = 0; }
        break;
      default: // flee / recover
        away(sc, m, m.state === 'flee' ? 170 : 120, dt);
        if ((m.timer -= dt) <= 0) m.state = 'hover';
    }
    if (sc.lightRepels && d < 200 && m.state !== 'flee') { m.state = 'flee'; m.timer = 1.5; }
  },
  onProgress(sc, m) { if (m.state === 'hover') { m.state = 'chase'; m.loseT = 0; sfx.screech(); } },
  onItem: defaultOnItem,
  canHit: (sc, m) => m.state !== 'flee' && m.state !== 'recover',
  onHit(sc, m) { m.state = 'recover'; m.timer = 1.6; },
  draw(ctx, sc, m) {
    const r = sc.cfg.radius, flap = Math.abs(Math.sin(m.flap)), ang = Math.atan2(m.vy, m.vx) + Math.PI / 2;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(ang);
    ctx.fillStyle = m.state === 'enraged' ? '#5a3434' : '#4a443c';
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1);
      ctx.beginPath(); ctx.ellipse(r * 0.75 * (0.4 + flap * 0.6), -4, r * 1.05 * (0.35 + flap * 0.65), r * 0.85, -0.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.55 * (0.4 + flap * 0.6), 10, r * 0.6 * (0.35 + flap * 0.65), r * 0.55, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#2b2622';
    ctx.beginPath(); ctx.ellipse(0, 2, r * 0.3, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
  drawAbove(ctx, sc, m) {
    const a = m.state === 'enraged' ? 1 : m.state === 'chase' ? 0.85 : 0.5;
    glowEyes(ctx, m.x, m.y, Math.atan2(m.vy, m.vx) + Math.PI / 2, '255,60,40', a);
  },
};

// ================= 杯弓蛇影：你不動，牠才動 =================
const stillness = {
  init(sc, m) {
    Object.assign(m, { state: 'idle', trail: [], scale: 1, home: { ...sc.cfg.start } });
    setPresence(2600, 5, 0.8);
  },
  update(sc, m, dt) {
    const p = sc.player, cfg = sc.cfg, d = dist(m, p);
    const speed = cfg.speed + sc.done * cfg.speedPerObjective;
    m.moving = false;
    if (sc.lightRepels && d < 230 && m.state !== 'flee') { m.state = 'flee'; m.timer = 1.2; }
    if (m.state === 'flee') {
      away(sc, m, 150, dt); m.moving = true;
      if ((m.timer -= dt) <= 0) m.state = 'idle';
    } else if (m.state === 'enraged') {
      steer(sc, m, p.x, p.y, speed * 0.8, dt, 0.9); m.moving = true;
      if ((m.timer -= dt) <= 0) m.state = 'idle';
    } else if (!p.moving) {
      steer(sc, m, p.x, p.y, speed, dt, 0.9, 6); m.moving = true;
    } else {
      // 你在移動：牠僵住，慢慢縮回暗處
      if (dist(m, m.home) > 10 && d < 520) {
        steer(sc, m, m.home.x, m.home.y, cfg.retreatSpeed, dt, 0.9, 6);
      } else { m.vx *= 0.8; m.vy *= 0.8; }
    }
    if (m.moving || Math.hypot(m.vx, m.vy) > 5) {
      m.trail.unshift({ x: m.x, y: m.y });
      if (m.trail.length > 46) m.trail.pop();
    }
  },
  onItem(sc, m, effect, d) {
    if (effect === 'provoked') { m.state = 'enraged'; m.timer = 3; m.scale = Math.min(2, m.scale + 0.3); sfx.screech(); return 'provoked'; }
    return defaultOnItem(sc, m, effect, d);
  },
  canHit: (sc, m) => m.state !== 'flee',
  onHit(sc, m) {
    // 撞到後退回離玩家最遠的角落
    const corners = [{ x: 90, y: 90 }, { x: sc.map.width - 90, y: 90 }, { x: 90, y: sc.map.height - 90 }, { x: sc.map.width - 90, y: sc.map.height - 90 }];
    corners.sort((a, b) => dist(b, sc.player) - dist(a, sc.player));
    Object.assign(m, corners[0]); m.home = { ...corners[0] }; m.trail = []; m.state = 'idle';
  },
  draw(ctx, sc, m) {
    const w = 9 * m.scale;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pts = [{ x: m.x, y: m.y }, ...m.trail.filter((_, i) => i % 3 === 0)];
    for (let i = pts.length - 1; i > 0; i--) {
      ctx.strokeStyle = `rgba(52,62,40,${0.9 - i / pts.length * 0.6})`;
      ctx.lineWidth = w * (1 - i / pts.length * 0.7);
      ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i - 1].x, pts[i - 1].y); ctx.stroke();
    }
    ctx.fillStyle = '#34402a';
    ctx.beginPath(); ctx.ellipse(m.x, m.y, w * 1.1, w * 0.85, Math.atan2(m.vy, m.vx), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
  drawAbove(ctx, sc, m) {
    const a = m.moving ? 0.95 : 0.35;
    const ang = Math.atan2(m.vy, m.vx) + Math.PI / 2;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(ang);
    for (const s of [-1, 1]) {
      ctx.fillStyle = `rgba(230,200,60,${a})`;
      ctx.beginPath(); ctx.ellipse(s * 4 * m.scale, -4, 2.2, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(s * 4 * m.scale - 0.5, -7, 1, 6);
    }
    ctx.restore();
  },
};

// ================= 守口如瓶：看不見，只聽得見 =================
const blind = {
  init(sc, m) {
    Object.assign(m, { state: 'wander', target: randomPoint(sc), listenT: 0, heardAt: null });
    setPresence(220, 1.6, 0.7);
  },
  update(sc, m, dt) {
    const p = sc.player, cfg = sc.cfg, d = dist(m, p);
    const hunt = cfg.huntSpeed + sc.done * cfg.speedPerObjective;
    // 聽到聲音
    if (m.state !== 'flee' && sc.noise > 0 && d < sc.noise) {
      if (m.state !== 'hunt' && m.state !== 'enraged') sfx.screech();
      if (m.state !== 'enraged') m.state = 'hunt';
      m.target = { x: p.x, y: p.y };
      m.heardAt = { x: p.x, y: p.y, t: sc.t };
    }
    switch (m.state) {
      case 'wander':
        steer(sc, m, m.target.x, m.target.y, cfg.wanderSpeed, dt, 0.2, 2);
        if (dist(m, m.target) < 20) m.target = randomPoint(sc);
        break;
      case 'hunt':
        steer(sc, m, m.target.x, m.target.y, hunt, dt, 0.15, 5);
        if (dist(m, m.target) < 18) { m.state = 'listen'; m.listenT = 2.2; }
        break;
      case 'listen':
        m.vx *= 0.85; m.vy *= 0.85;
        if ((m.listenT -= dt) <= 0) { m.state = 'wander'; m.target = randomPoint(sc); }
        break;
      case 'enraged':
        steer(sc, m, p.x, p.y, cfg.enragedSpeed, dt, 0.15, 5);
        if ((m.timer -= dt) <= 0) { m.state = 'listen'; m.listenT = 1.5; }
        break;
      default:
        away(sc, m, 120, dt);
        if ((m.timer -= dt) <= 0) { m.state = 'wander'; m.target = randomPoint(sc); }
    }
    collideObstacles(m, sc.cfg.radius * 0.6, sc.map);
    // 卡在牆邊太久就換個方向
    m.checkT = (m.checkT ?? 1) - dt;
    if (m.checkT <= 0) {
      m.checkT = 1.2;
      const moved = m.lastPos ? dist(m, m.lastPos) : 99;
      m.lastPos = { x: m.x, y: m.y };
      if (moved < 12 && (m.state === 'hunt' || m.state === 'wander')) { m.state = 'wander'; m.target = randomPoint(sc); }
    }
  },
  onProgress(sc) { sc.makeNoise(230); },
  onItem: defaultOnItem,
  canHit: (sc, m) => m.state !== 'flee' && m.state !== 'recover',
  onHit(sc, m) { m.state = 'recover'; m.timer = 2; },
  draw(ctx, sc, m) {
    const r = sc.cfg.radius, breathe = Math.sin(sc.t * 2) * 1.5;
    ctx.save(); ctx.translate(m.x, m.y);
    ctx.fillStyle = '#8e8a84';
    ctx.beginPath(); ctx.ellipse(0, 4, r * 0.8, r + breathe, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a7a29a';
    ctx.beginPath(); ctx.arc(0, -r * 0.6, r * 0.55, 0, Math.PI * 2); ctx.fill();
    // 大耳朵
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(s * r * 0.75, -r * 0.7, r * 0.35, r * 0.6, s * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    // 縫起來的嘴
    ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-5, -r * 0.4); ctx.lineTo(5, -r * 0.4);
    for (let i = -4; i <= 4; i += 2) { ctx.moveTo(i, -r * 0.4 - 2); ctx.lineTo(i, -r * 0.4 + 2); }
    ctx.stroke();
    ctx.restore();
  },
  drawAbove(ctx, sc, m) {
    // 牠沒有眼睛；靠近時只看得到一圈模糊的輪廓
    const d = dist(m, sc.player);
    const a = clamp(1 - d / 380, 0, 1) * (m.state === 'hunt' || m.state === 'enraged' ? 0.55 : 0.25);
    if (a <= 0.01) return;
    ctx.strokeStyle = `rgba(220,215,205,${a})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(m.x, m.y - 4, sc.cfg.radius * 0.9, sc.cfg.radius * 1.4, 0, 0, Math.PI * 2); ctx.stroke();
  },
};

// ================= 如影隨形：一步不差地走你走過的路 =================
const trail = {
  init(sc, m) {
    Object.assign(m, { path: [], delay: sc.cfg.delay, freezeT: 0, active: false });
    setPresence(900, 0.6, 2);
  },
  update(sc, m, dt) {
    const cfg = sc.cfg, p = sc.player;
    m.path.push({ t: sc.t, x: p.x, y: p.y });
    const base = Math.max(cfg.minDelay, cfg.delay - sc.done * cfg.delayPerObjective);
    if (m.freezeT > 0) { m.freezeT -= dt; m.delay += dt; }
    else if (m.delay > base) m.delay = Math.max(base, m.delay - dt * 0.22);
    if (sc.lightProvokes) m.delay = Math.max(cfg.minDelay * 0.7, m.delay - dt * 0.35);
    // 丟掉太舊的路徑
    const cutoff = sc.t - 30;
    while (m.path.length > 2 && m.path[0].t < cutoff) m.path.shift();
    const when = sc.t - m.delay;
    m.active = when > 0.3;
    if (!m.active) { m.x = -999; m.y = -999; return; }
    // 找到 delay 秒前的位置
    let i = m.path.length - 1;
    while (i > 0 && m.path[i].t > when) i--;
    const a = m.path[i], b = m.path[Math.min(i + 1, m.path.length - 1)];
    const k = b.t > a.t ? clamp((when - a.t) / (b.t - a.t), 0, 1) : 0;
    const nx = a.x + (b.x - a.x) * k, ny = a.y + (b.y - a.y) * k;
    m.vx = (nx - m.x) / Math.max(dt, 0.001); m.vy = (ny - m.y) / Math.max(dt, 0.001);
    if (Math.abs(nx - m.x) > 100 || Math.abs(ny - m.y) > 100) { m.vx = 0; m.vy = 0; }
    m.x = nx; m.y = ny;
  },
  onItem(sc, m, effect) {
    if (effect === 'effective') { m.freezeT = 4; return 'effective'; }
    if (effect === 'provoked') { m.delay = Math.max(sc.cfg.minDelay * 0.7, m.delay - 1.5); sfx.screech(); return 'provoked'; }
    return 'none';
  },
  canHit: (sc, m) => m.active && m.freezeT <= 0,
  onHit(sc, m) { m.delay += 2.5; },
  draw(ctx, sc, m) {
    if (!m.active) return;
    ctx.save(); ctx.translate(m.x, m.y);
    ctx.fillStyle = 'rgba(0,0,0,.88)';
    ctx.beginPath(); ctx.ellipse(0, 3, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -10, 8, 0, Math.PI * 2); ctx.fill();
    // 邊緣抖動，像不穩定的影子
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = 15 + Math.sin(sc.t * 9 + i * 1.7) * 3;
      i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.restore();
  },
  drawAbove(ctx, sc, m) {
    if (!m.active) return;
    const a = m.freezeT > 0 ? 0.3 : 0.9;
    ctx.fillStyle = `rgba(245,245,255,${a})`;
    ctx.beginPath(); ctx.arc(m.x - 3, m.y - 11, 1.6, 0, Math.PI * 2); ctx.arc(m.x + 3, m.y - 11, 1.6, 0, Math.PI * 2); ctx.fill();
  },
};

// ================= 請君入甕：藏在其中一個甕裡 =================
const urn = {
  init(sc, m) {
    const idx = Math.floor(Math.random() * sc.targets.length);
    sc.targets[idx].trap = true;
    Object.assign(m, { hidden: true, trapIndex: idx, knockT: 2, state: 'hidden', loseT: 0, x: -999, y: -999 });
    setPresence(140, 7, 1);
  },
  burst(sc, m) {
    if (!m.hidden) return;
    const jar = sc.targets[m.trapIndex];
    jar.broken = true; jar.progress = 0;
    m.hidden = false; m.x = jar.x; m.y = jar.y; m.vx = 0; m.vy = 0;
    m.state = 'emerge'; m.timer = 0.9; // 爬出來的瞬間給玩家一點反應時間
    sfx.shatter(); sfx.screech();
    sc.shake = 1.2;
    sc.toast('甕裂開了！');
  },
  update(sc, m, dt) {
    const p = sc.player, cfg = sc.cfg;
    if (m.hidden) {
      const jar = sc.targets[m.trapIndex];
      jar.rattle = Math.max(0, (jar.rattle || 0) - dt * 3);
      if ((m.knockT -= dt) <= 0) {
        m.knockT = 1.6 + Math.random() * 2.2;
        const vol = clamp(1 - dist(jar, p) / 700, 0.04, 1) * 0.45;
        sfx.knock(vol);
        jar.rattle = 1;
      }
      if (sc.t > cfg.burstAfter) this.burst(sc, m);
      return;
    }
    const d = dist(m, p);
    const chase = cfg.chaseSpeed + sc.done * cfg.speedPerObjective;
    switch (m.state) {
      case 'chase':
        steer(sc, m, p.x, p.y, chase, dt, 0.4);
        if (d > cfg.loseRadius) { m.loseT += dt; if (m.loseT > 2) { m.state = 'prowl'; m.target = randomPoint(sc); } } else m.loseT = 0;
        break;
      case 'prowl':
        steer(sc, m, m.target.x, m.target.y, 70, dt, 0.4);
        if (dist(m, m.target) < 20) m.target = randomPoint(sc);
        if (d < 170) { m.state = 'chase'; m.loseT = 0; }
        break;
      case 'enraged':
        steer(sc, m, p.x, p.y, cfg.enragedSpeed, dt, 0.3);
        if ((m.timer -= dt) <= 0) { m.state = 'chase'; m.loseT = 0; }
        break;
      case 'emerge':
        m.vx = 0; m.vy = 0;
        if ((m.timer -= dt) <= 0) { m.state = 'enraged'; m.timer = 2; }
        break;
      default:
        away(sc, m, m.state === 'flee' ? 165 : 120, dt);
        if ((m.timer -= dt) <= 0) { m.state = 'prowl'; m.target = randomPoint(sc); }
    }
  },
  onTargetProgress(sc, m, target) {
    if (target.trap && m.hidden && target.progress > 0.35) this.burst(sc, m);
  },
  onItem(sc, m, effect, d) {
    if (m.hidden) {
      if (effect === 'provoked') { this.burst(sc, m); return 'provoked'; }
      return 'nothing';
    }
    return defaultOnItem(sc, m, effect, d);
  },
  canHit: (sc, m) => !m.hidden && m.state !== 'flee' && m.state !== 'recover' && m.state !== 'emerge',
  onHit(sc, m) { m.state = 'recover'; m.timer = 1.6; },
  presenceDistance: (sc, m) => (m.hidden ? Infinity : dist(m, sc.player)),
  draw(ctx, sc, m) {
    if (m.hidden) return;
    const r = sc.cfg.radius;
    ctx.save(); ctx.translate(m.x, m.y);
    ctx.fillStyle = '#2a2418';
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2, rr = r * (1 + Math.sin(sc.t * 5 + i * 2.1) * 0.12);
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.fill();
    // 長長的手臂
    ctx.strokeStyle = '#2a2418'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const sw = Math.sin(sc.t * 6 + s) * 8;
      ctx.beginPath(); ctx.moveTo(s * r * 0.6, 0); ctx.quadraticCurveTo(s * r * 1.6, -r * 0.5 + sw, s * r * 2.1, r * 0.6 + sw); ctx.stroke();
    }
    ctx.restore();
  },
  drawAbove(ctx, sc, m) {
    if (m.hidden) return;
    const a = m.state === 'enraged' ? 1 : m.state === 'chase' ? 0.85 : 0.45;
    glowEyes(ctx, m.x, m.y + 6, Math.atan2(m.vy, m.vx) + Math.PI / 2, '255,90,30', a, 5, 8);
  },
};

// 讓地面上的怪物不要穿牆（飛的、影子類不用）
function collideObstacles(m, r, map) {
  for (const o of map.obstacles) {
    const nx = clamp(m.x, o.x, o.x + o.w), ny = clamp(m.y, o.y, o.y + o.h);
    const dx = m.x - nx, dy = m.y - ny, d = Math.hypot(dx, dy);
    if (d < r && d > 0) { m.x = nx + (dx / d) * r; m.y = ny + (dy / d) * r; }
  }
}

export const BEHAVIORS = { moth, stillness, blind, trail, urn };
