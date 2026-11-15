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
    ctx.strokeStyle = `rgba(190,190,225,${a * 0.4})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(m.x, m.y + 3, 11, 13, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(m.x, m.y - 10, 9, 0, Math.PI * 2); ctx.stroke();
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


// 怪物用的人形剪影（夜長夢多的分身、鏡花水月的倒影）
function drawFigure(ctx, x, y, o) {
  const bob = o.moving ? Math.sin(o.step) * 1.2 : 0;
  const sway = o.moving ? Math.sin(o.step * 0.5) * 1.5 : 0;
  const face = o.face || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = o.body;
  ctx.beginPath(); ctx.moveTo(-4, -7 + bob); ctx.lineTo(4, -7 + bob); ctx.lineTo(7 + sway, 13); ctx.lineTo(-7 + sway, 13); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = o.body; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -5 + bob); ctx.lineTo(-7 - sway * 0.5, 5 + bob); ctx.moveTo(4, -5 + bob); ctx.lineTo(7 - sway * 0.5, 5 + bob); ctx.stroke();
  ctx.fillStyle = o.skin;
  ctx.beginPath(); ctx.ellipse(0, -13 + bob, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = o.hair;
  ctx.beginPath(); ctx.ellipse(0, -15 + bob, 6, 5.5, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(6 - face * 2, -2 + bob); ctx.lineTo(3 - face * 3, -8 + bob); ctx.lineTo(-3 - face * 3, -8 + bob); ctx.lineTo(-6 - face * 2, -2 + bob);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ================= 草木皆兵：一群稻草人，只有一個是真的 =================
const decoys = {
  init(sc, m) {
    const figs = sc.cfg.figures.map((f) => ({ x: f.x, y: f.y, home: { ...f }, vx: 0, vy: 0, seed: Math.random() * 10, shake: 0, scareT: 0 }));
    const real = Math.floor(Math.random() * figs.length);
    Object.assign(m, { figs, real, state: 'still', swapT: sc.cfg.swapEvery, revealT: 0, timer: 0 });
    m.x = figs[real].x; m.y = figs[real].y;
    setPresence(1800, 3, 0.6);
  },
  // 你不在附近時，真的那個偷偷換到別的稻草人身上
  swap(sc, m) {
    if (m.state !== 'still') return;
    const p = sc.player;
    const options = m.figs.map((f, i) => i).filter((i) => i !== m.real && dist(m.figs[i].home, p) > 260);
    if (options.length) m.real = options[Math.floor(Math.random() * options.length)];
  },
  update(sc, m, dt) {
    const p = sc.player, cfg = sc.cfg;
    m.figs.forEach((f, i) => {
      f.shake = Math.max(0, f.shake - dt * 2);
      f.scareT = Math.max(0, f.scareT - dt);
      // 假的：走近會抖一下、嚇你一跳，但不會傷人
      if (i !== m.real && f.scareT <= 0 && dist(f, p) < 80) {
        f.shake = 1; f.scareT = 6;
        sc.fear = Math.min(100, sc.fear + 5 * sc.mods.fearRate);
        sfx.knock(0.18);
      }
    });
    m.revealT = Math.max(0, m.revealT - dt);
    const b = m.figs[m.real];
    const d = dist(b, p);
    switch (m.state) {
      case 'still':
        b.vx = 0; b.vy = 0;
        if (d < cfg.lungeRange) { m.state = 'lunge'; m.timer = 2.2; sfx.screech(); }
        if ((m.swapT -= dt) <= 0) { m.swapT = cfg.swapEvery; if (d > 320) this.swap(sc, m); }
        break;
      case 'lunge':
        steer(sc, b, p.x, p.y, cfg.lungeSpeed + sc.done * cfg.speedPerObjective, dt, 0.2, 6);
        if ((m.timer -= dt) <= 0) m.state = 'return';
        break;
      case 'enraged':
        steer(sc, b, p.x, p.y, cfg.enragedSpeed, dt, 0.2, 6);
        if ((m.timer -= dt) <= 0) m.state = 'return';
        break;
      case 'return':
        steer(sc, b, b.home.x, b.home.y, 85, dt, 0.1, 5);
        if (dist(b, b.home) < 6) { b.x = b.home.x; b.y = b.home.y; m.state = 'still'; }
        if (d < cfg.lungeRange * 0.7) { m.state = 'lunge'; m.timer = 1.6; }
        break;
      default: // flee / recover
        away(sc, b, m.state === 'flee' ? 150 : 110, dt);
        if ((m.timer -= dt) <= 0) m.state = 'return';
    }
    collideObstacles(b, 10, sc.map);
    m.x = b.x; m.y = b.y; m.vx = b.vx; m.vy = b.vy;
  },
  onProgress(sc, m) { this.swap(sc, m); },
  onItem(sc, m, effect, d) {
    if (effect === 'effective') {
      if (d > 300) return 'far';
      m.state = 'flee'; m.timer = 3.5; m.revealT = 7;
      return 'effective';
    }
    if (effect === 'provoked') {
      m.state = 'enraged'; m.timer = 4;
      m.figs.forEach((f) => { f.shake = 1; });
      sfx.screech();
      return 'provoked';
    }
    return d < 400 ? 'none' : 'nothing';
  },
  canHit: (sc, m) => m.state !== 'flee' && m.state !== 'recover',
  onHit(sc, m) { m.state = 'recover'; m.timer = 1.2; },
  draw(ctx, sc, m) {
    m.figs.forEach((f, i) => {
      const real = i === m.real;
      // 真的那個會呼吸：身體微微脹縮，草帽一直有點歪
      const breathe = real ? 1 + Math.sin(sc.t * 2.6) * 0.06 : 1;
      const jit = f.shake * 2 * Math.sin(sc.t * 40 + i);
      ctx.save();
      ctx.translate(f.x + jit, f.y);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.beginPath(); ctx.ellipse(4, 16, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a3a26'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, -18); ctx.moveTo(-16, -6); ctx.lineTo(16, -6); ctx.stroke();
      ctx.strokeStyle = '#a89058'; ctx.lineWidth = 1.2;
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.moveTo(s * 16, -6); ctx.lineTo(s * (19 + k), -2 + k * 3); ctx.stroke();
      }
      ctx.scale(breathe, breathe);
      ctx.fillStyle = '#6a5838';
      ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.lineTo(10, 8); ctx.lineTo(-10, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c8b890';
      ctx.beginPath(); ctx.arc(0, -16, 6, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.rotate(real ? 0.18 : 0);
      ctx.fillStyle = '#8a7040';
      ctx.beginPath(); ctx.ellipse(0, -20, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -23, 6, 4, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.restore();
    });
  },
  drawAbove(ctx, sc, m) {
    const b = m.figs[m.real];
    if (m.revealT > 0) {
      ctx.strokeStyle = `rgba(230,70,50,${Math.min(1, m.revealT / 2) * 0.8})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(b.x, b.y - 4, 18, 26, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (m.state === 'lunge' || m.state === 'enraged') {
      ctx.fillStyle = 'rgba(255,80,50,.9)';
      ctx.beginPath(); ctx.arc(b.x - 2.5, b.y - 16, 1.4, 0, Math.PI * 2); ctx.arc(b.x + 2.5, b.y - 16, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  },
};

// ================= 亡羊補牢：你補好的，牠會再拆開 =================
const undo = {
  init(sc, m) {
    Object.assign(m, { state: 'prowl', target: randomPoint(sc), loseT: 0, goal: null, tearing: null, knockT: 0 });
    setPresence(300, 9, 1.4);
  },
  stopTearing(m) { if (m.tearing) { m.tearing.tear = 0; m.tearing = null; } },
  update(sc, m, dt) {
    const p = sc.player, cfg = sc.cfg, d = dist(m, p);
    const chase = cfg.chaseSpeed + sc.done * cfg.speedPerObjective;
    if (m.state !== 'tear') this.stopTearing(m);
    switch (m.state) {
      case 'prowl': {
        // 有補好的洞，就去拆離你最遠的那一個
        const done = sc.targets.filter((t) => t.done);
        if (done.length) {
          done.sort((a, b) => dist(b.anchor, p) - dist(a.anchor, p));
          m.goal = done[0]; m.state = 'seek';
          break;
        }
        steer(sc, m, m.target.x, m.target.y, cfg.prowlSpeed, dt, 0.3, 3);
        if (dist(m, m.target) < 20) m.target = randomPoint(sc);
        if (d < cfg.detectRadius) { m.state = 'chase'; m.loseT = 0; sfx.screech(); }
        break;
      }
      case 'seek':
        if (!m.goal?.done) { m.state = 'prowl'; break; }
        steer(sc, m, m.goal.anchor.x, m.goal.anchor.y, cfg.seekSpeed, dt, 0.2, 4);
        if (dist(m, m.goal.anchor) < 24) { m.state = 'tear'; m.tearing = m.goal; m.timer = cfg.tearTime; }
        if (d < cfg.detectRadius * 0.7) { m.state = 'chase'; m.loseT = 0; }
        break;
      case 'tear':
        m.vx *= 0.8; m.vy *= 0.8;
        m.tearing.tear = 1 - m.timer / cfg.tearTime;
        if ((m.knockT -= dt) <= 0) { m.knockT = 0.45; sfx.knock(clamp(1 - d / 600, 0.08, 1) * 0.4); }
        if ((m.timer -= dt) <= 0) {
          const t = m.tearing;
          this.stopTearing(m);
          sc.reopenTarget(t);
          m.state = 'prowl';
        } else if (d < 90) {
          // 你靠太近，牠丟下木板轉身撲你
          this.stopTearing(m); m.state = 'chase'; m.loseT = 0; sfx.screech();
        }
        break;
      case 'chase':
        steer(sc, m, p.x, p.y, chase, dt, 0.3);
        if (d > cfg.loseRadius) { m.loseT += dt; if (m.loseT > 1.5) m.state = 'prowl'; } else m.loseT = 0;
        break;
      case 'enraged':
        steer(sc, m, p.x, p.y, cfg.enragedSpeed, dt, 0.3);
        if ((m.timer -= dt) <= 0) { m.state = 'chase'; m.loseT = 0; }
        break;
      default:
        away(sc, m, m.state === 'flee' ? 160 : 120, dt);
        if ((m.timer -= dt) <= 0) m.state = 'prowl';
    }
    collideObstacles(m, cfg.radius * 0.6, sc.map);
  },
  onItem: defaultOnItem,
  canHit: (sc, m) => m.state !== 'flee' && m.state !== 'recover',
  onHit(sc, m) { m.state = 'recover'; m.timer = 1.6; },
  draw(ctx, sc, m) {
    const r = sc.cfg.radius, ang = Math.atan2(m.vy, m.vx);
    const run = Math.sin(sc.t * 12) * (Math.hypot(m.vx, m.vy) > 20 ? 3 : 0.5);
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(3, 6, r * 1.3, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = m.state === 'enraged' ? '#4a2a22' : '#3a332a';
    ctx.beginPath(); ctx.ellipse(-2, 0, r * 1.2, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();   // 身體
    ctx.beginPath(); ctx.ellipse(r * 1.05, 0, r * 0.5, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); // 頭
    ctx.beginPath(); ctx.moveTo(r * 1.3, -2); ctx.lineTo(r * 1.9, 0); ctx.lineTo(r * 1.3, 4); ctx.fill(); // 嘴
    for (const s of [-1, 1]) { // 耳朵與腳
      ctx.beginPath(); ctx.moveTo(r * 0.9, s * r * 0.3); ctx.lineTo(r * 0.75, s * r * 0.75); ctx.lineTo(r * 1.15, s * r * 0.35); ctx.fill();
      ctx.fillRect(r * 0.5 + run * s, s * r * 0.5, 4, s * 6);
      ctx.fillRect(-r * 0.9 - run * s, s * r * 0.5, 4, s * 6);
    }
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 1.2, 0); ctx.quadraticCurveTo(-r * 1.8, Math.sin(sc.t * 6) * 6, -r * 2.1, 4); ctx.stroke();
    ctx.restore();
  },
  drawAbove(ctx, sc, m) {
    const a = m.state === 'enraged' ? 1 : m.state === 'chase' ? 0.85 : m.state === 'tear' ? 0.7 : 0.45;
    glowEyes(ctx, m.x + Math.cos(Math.atan2(m.vy, m.vx)) * 22, m.y + Math.sin(Math.atan2(m.vy, m.vx)) * 22 + 10,
      Math.atan2(m.vy, m.vx) + Math.PI / 2, '255,190,60', a, 3.5, 7);
  },
};

// ================= 夜長夢多：鐘每響一次，就多一個你 =================
const swarm = {
  init(sc, m) {
    Object.assign(m, { bodies: [], spawnT: sc.cfg.spawnEvery * 0.6, hitBody: null });
    this.spawn(sc, m, true);
    setPresence(700, 0.8, 1.5);
  },
  spawn(sc, m, quiet) {
    if (m.bodies.length >= sc.cfg.maxBodies) return;
    const p = sc.player;
    // 從還在走的鐘裡生出來，挑離你遠一點的
    const clocks = sc.targets.filter((t) => !t.done).sort((a, b) => dist(b, p) - dist(a, p));
    const c = clocks[Math.floor(Math.random() * Math.min(2, clocks.length))] || { x: sc.map.width / 2, y: 200 };
    m.bodies.push({ x: c.x, y: c.y + 26, vx: 0, vy: 0, seed: Math.random() * 10, state: 'wander', target: randomPoint(sc), timer: 0, step: 0 });
    if (!quiet) { sfx.chime(); sc.toast('鐘響了。黑暗裡又多了一個。', 2); }
  },
  update(sc, m, dt) {
    const cfg = sc.cfg, p = sc.player;
    if ((m.spawnT -= dt) <= 0) { m.spawnT = cfg.spawnEvery; if (sc.targets.some((t) => !t.done)) this.spawn(sc, m); }
    const chase = cfg.chaseSpeed + sc.done * cfg.speedPerObjective;
    let near = null, nd = Infinity;
    for (const b of m.bodies) {
      const d = dist(b, p);
      if (sc.lightRepels && d < 200 && b.state !== 'flee') { b.state = 'flee'; b.timer = 1.5; }
      switch (b.state) {
        case 'wander':
          steer(sc, b, b.target.x, b.target.y, cfg.wanderSpeed, dt, 0.3, 2);
          if (dist(b, b.target) < 20) b.target = randomPoint(sc);
          if (d < cfg.detectRadius) b.state = 'chase';
          break;
        case 'chase':
          steer(sc, b, p.x, p.y, chase, dt, 0.3);
          if (d > cfg.detectRadius * 1.8) b.state = 'wander';
          break;
        case 'enraged':
          steer(sc, b, p.x, p.y, chase * 1.4, dt, 0.3);
          if ((b.timer -= dt) <= 0) b.state = 'chase';
          break;
        default:
          away(sc, b, b.state === 'flee' ? 140 : 100, dt);
          if ((b.timer -= dt) <= 0) b.state = 'wander';
      }
      collideObstacles(b, 8, sc.map);
      b.step += Math.hypot(b.vx, b.vy) * dt * 0.1;
      if (d < nd && b.state !== 'flee' && b.state !== 'recover') { nd = d; near = b; }
    }
    m.hitBody = near;
    let closest = null, cd = Infinity;
    for (const b of m.bodies) { const d = dist(b, p); if (d < cd) { cd = d; closest = b; } }
    const t = near || closest;
    if (t) { m.x = t.x; m.y = t.y; m.vx = t.vx; m.vy = t.vy; } else { m.x = -999; m.y = -999; }
  },
  // 停下一個鐘，離你最近的那個分身就消失
  onProgress(sc, m) {
    if (m.bodies.length <= 1) return;
    m.bodies.sort((a, b) => dist(a, sc.player) - dist(b, sc.player));
    m.bodies.shift();
  },
  onItem(sc, m, effect) {
    const p = sc.player;
    if (effect === 'effective') {
      let n = 0;
      for (const b of m.bodies) if (dist(b, p) < 280) { b.state = 'flee'; b.timer = 4; n++; }
      return n ? 'effective' : 'far';
    }
    if (effect === 'provoked') {
      this.spawn(sc, m);
      for (const b of m.bodies) { b.state = 'enraged'; b.timer = 3; }
      sfx.screech();
      return 'provoked';
    }
    return 'none';
  },
  canHit: (sc, m) => !!m.hitBody,
  onHit(sc, m) { if (m.hitBody) { m.hitBody.state = 'recover'; m.hitBody.timer = 1.8; } },
  draw(ctx, sc, m) {
    for (const b of m.bodies) {
      drawFigure(ctx, b.x, b.y, {
        body: '#4a4c52', skin: '#8a8580', hair: '#0c0a09', alpha: 0.92,
        step: b.step, moving: Math.hypot(b.vx, b.vy) > 10, face: Math.sign(b.vx) || 1,
      });
    }
  },
  drawAbove(ctx, sc, m) {
    for (const b of m.bodies) {
      const a = b.state === 'chase' || b.state === 'enraged' ? 0.9 : 0.4;
      ctx.fillStyle = `rgba(255,70,50,${a})`;
      ctx.beginPath(); ctx.arc(b.x - 2, b.y - 13, 1.3, 0, Math.PI * 2); ctx.arc(b.x + 2, b.y - 13, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  },
};

// ================= 畫龍點睛：很長的墨龍，碰到身體也會痛 =================
const dragon = {
  init(sc, m) {
    m.head = { x: m.x, y: m.y, vx: 0, vy: 0, seed: Math.random() * 10 };
    Object.assign(m, { state: 'wander', target: randomPoint(sc), path: [], segs: [], timer: 0 });
    for (let i = 0; i < 400; i++) m.path.push({ x: m.x, y: m.y });
    setPresence(160, 2.2, 0.9);
  },
  update(sc, m, dt) {
    const p = sc.player, cfg = sc.cfg, h = m.head;
    const dh = dist(h, p);
    const chase = cfg.chaseSpeed + sc.done * cfg.speedPerObjective;
    switch (m.state) {
      case 'wander':
        steer(sc, h, m.target.x, m.target.y, cfg.headSpeed, dt, 0.7, 2.5);
        if (dist(h, m.target) < 30) m.target = randomPoint(sc);
        if (dh < cfg.detectRadius) { m.state = 'chase'; m.timer = 3; sfx.screech(); }
        break;
      case 'chase':
        steer(sc, h, p.x, p.y, chase, dt, 0.5, 3);
        if ((m.timer -= dt) <= 0) { m.state = 'wander'; m.target = randomPoint(sc); }
        break;
      case 'enraged':
        steer(sc, h, p.x, p.y, cfg.enragedSpeed, dt, 0.6, 3);
        if ((m.timer -= dt) <= 0) { m.state = 'wander'; m.target = randomPoint(sc); }
        break;
      default:
        away(sc, h, m.state === 'flee' ? 150 : 110, dt);
        if ((m.timer -= dt) <= 0) { m.state = 'wander'; m.target = randomPoint(sc); }
    }
    // 頭走過的路就是身體；每捲起一卷畫，身體就長一截
    const last = m.path[0];
    if (Math.hypot(h.x - last.x, h.y - last.y) > 4) { m.path.unshift({ x: h.x, y: h.y }); if (m.path.length > 400) m.path.pop(); }
    const n = cfg.segments + sc.done * cfg.segmentsPerObjective;
    m.segs = [];
    for (let i = 0; i < n && i * 3 < m.path.length; i++) m.segs.push(m.path[i * 3]);
    // 身上離你最近的那一點，當作碰撞的位置
    let best = h, bd = dh;
    for (const s of m.segs) { const d = dist(s, p); if (d < bd) { bd = d; best = s; } }
    m.x = best.x; m.y = best.y; m.vx = h.vx; m.vy = h.vy;
  },
  onItem(sc, m, effect, d) {
    if (effect === 'effective') {
      if (dist(m.head, sc.player) > 300) return 'far';
      m.state = 'flee'; m.timer = 4;
      return 'effective';
    }
    if (effect === 'provoked') { m.state = 'enraged'; m.timer = 4; sfx.screech(); return 'provoked'; }
    return d < 400 ? 'none' : 'nothing';
  },
  canHit: (sc, m) => m.state !== 'recover',
  onHit(sc, m) { m.state = 'recover'; m.timer = 1.4; },
  draw(ctx, sc, m) {
    const segs = m.segs;
    if (segs.length < 2) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 先畫淡淡的墨暈，再畫濃墨的身體，越到尾巴越細
    for (const [w, color] of [[30, 'rgba(70,64,58,.35)'], [18, '#14110e']]) {
      for (let i = segs.length - 1; i > 0; i--) {
        const k = 1 - i / segs.length;
        ctx.strokeStyle = color;
        ctx.lineWidth = w * (0.3 + k * 0.7);
        ctx.beginPath(); ctx.moveTo(segs[i].x, segs[i].y); ctx.lineTo(segs[i - 1].x, segs[i - 1].y); ctx.stroke();
      }
    }
    // 背上的鰭
    ctx.fillStyle = '#14110e';
    for (let i = 4; i < segs.length - 2; i += 4) {
      const a = segs[i], b = segs[i + 1];
      const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      const s = 9 * (1 - i / segs.length) + 3;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + Math.cos(ang) * s, a.y + Math.sin(ang) * s); ctx.lineTo(b.x, b.y); ctx.fill();
    }
    // 頭與鬚
    const h = m.head, ang = Math.atan2(h.vy, h.vx);
    ctx.translate(h.x, h.y); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(4, 0, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#14110e'; ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(14, s * 5); ctx.quadraticCurveTo(28, s * (12 + Math.sin(sc.t * 4) * 4), 34, s * 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, s * 8); ctx.lineTo(-12, s * 18); ctx.stroke(); // 角
    }
    ctx.restore();
  },
  drawAbove(ctx, sc, m) {
    // 牠沒有眼睛：只有兩個空空的白圈
    const h = m.head, ang = Math.atan2(h.vy, h.vx);
    const a = m.state === 'chase' || m.state === 'enraged' ? 0.8 : 0.4;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang);
    ctx.strokeStyle = `rgba(235,225,205,${a})`; ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(8, s * 5, 3, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  },
};

// ================= 鏡花水月：倒影在另一半，慢半拍學你 =================
const mirror = {
  init(sc, m) {
    Object.assign(m, { hist: [], freezeT: 0, delay: sc.cfg.delay, pull: 0, ripple: 0, face: 1, step: 0, moving: false });
    setPresence(1100, 0.4, 2.5);
  },
  update(sc, m, dt) {
    const cfg = sc.cfg, p = sc.player, W = sc.map.width;
    m.hist.push({ t: sc.t, x: p.x, y: p.y, moving: p.moving, step: p.step, face: p.face });
    while (m.hist.length > 2 && m.hist[0].t < sc.t - 4) m.hist.shift();
    const base = Math.max(cfg.minDelay, cfg.delay - sc.done * cfg.delayPerObjective);
    m.delay += (base - m.delay) * Math.min(1, dt * 0.5);
    // 光會把倒影拉向你
    if (sc.lightProvokes) m.pull = Math.min(0.6, m.pull + dt * 0.15);
    else m.pull = Math.max(0, m.pull - dt * 0.05);
    m.ripple = Math.max(0, m.ripple - dt);
    if (m.freezeT > 0) { m.freezeT -= dt; m.vx = 0; m.vy = 0; return; }
    const when = sc.t - m.delay;
    let s = m.hist[0];
    for (const hh of m.hist) { if (hh.t <= when) s = hh; else break; }
    let tx = W - s.x, ty = s.y;
    tx += (p.x - tx) * m.pull; ty += (p.y - ty) * m.pull;
    m.vx = (tx - m.x) / Math.max(dt, 0.001); m.vy = (ty - m.y) / Math.max(dt, 0.001);
    m.x = tx; m.y = ty; m.face = -s.face; m.step = s.step; m.moving = s.moving;
  },
  onItem(sc, m, effect) {
    if (effect === 'effective') { m.freezeT = 4; m.ripple = 1; return 'effective'; }
    if (effect === 'provoked') { m.pull = Math.min(0.6, m.pull + 0.35); sfx.screech(); return 'provoked'; }
    return 'none';
  },
  canHit: (sc, m) => m.freezeT <= 0,
  onHit(sc, m) { m.freezeT = 2.5; m.ripple = 1; },
  draw(ctx, sc, m) {
    const wob = m.freezeT > 0 ? Math.sin(sc.t * 20) * 3 : 0;
    drawFigure(ctx, m.x + wob, m.y, {
      body: '#2a3440', skin: '#9aa8b8', hair: '#060809', alpha: m.freezeT > 0 ? 0.45 : 0.9,
      step: m.step, moving: m.moving, face: m.face,
    });
    if (m.ripple > 0) {
      ctx.strokeStyle = `rgba(180,210,240,${m.ripple * 0.5})`; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(m.x, m.y + 10, 12 + (1 - m.ripple) * 40 + i * 10, 5 + i * 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  },
  drawAbove(ctx, sc, m) {
    // 倒影的臉上有一道你沒有的微笑
    if (m.freezeT > 0) return;
    ctx.strokeStyle = 'rgba(230,240,255,.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(m.x, m.y - 13, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  },
};

export const BEHAVIORS = { moth, stillness, blind, trail, urn, decoys, undo, swarm, dragon, mirror };

