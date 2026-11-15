// 繪製：地圖（依主題）、目標物、玩家、道具特效
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------- 靜態地圖：只畫一次 ----------------
export function buildStaticLayer(story) {
  const map = story.map, theme = story.theme;
  const SCALE = 2;
  const c = document.createElement('canvas');
  c.width = map.width * SCALE; c.height = map.height * SCALE;
  const g = c.getContext('2d');
  g.scale(SCALE, SCALE);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  g.fillStyle = theme.base;
  g.fillRect(0, 0, map.width, map.height);
  FLOORS[theme.floor]?.(g, map, rnd);

  for (const d of map.decor || []) if (d.type === 'rug') DECOR_UNDER.rug(g, d);
  // 污漬
  for (let i = 0; i < 28; i++) {
    g.fillStyle = `rgba(0,0,0,${rnd() * 0.18})`;
    g.beginPath(); g.ellipse(rnd() * map.width, rnd() * map.height, 20 + rnd() * 60, 10 + rnd() * 30, rnd() * 3, 0, Math.PI * 2); g.fill();
  }
  for (const o of map.obstacles) {
    g.fillStyle = 'rgba(0,0,0,.45)';
    if (!o.wall) g.fillRect(o.x + 6, o.y + 8, o.w, o.h);
    (o.wall ? OBSTACLES.wall : OBSTACLES[o.type] || OBSTACLES[theme.obstacle] || OBSTACLES.crate)(g, o);
  }
  // 故事相關的擺設（不擋路）：拐杖、弓、樓梯、低語……
  for (const d of map.decor || []) DECOR[d.type]?.(g, d, map);
  g.fillStyle = '#0c0a09';
  g.fillRect(0, 0, map.width, map.wall);
  g.fillRect(0, map.height - map.wall, map.width, map.wall);
  g.fillRect(0, 0, map.wall, map.height);
  g.fillRect(map.width - map.wall, 0, map.wall, map.height);
  return c;
}

const FLOORS = {
  planks(g, map, rnd) {
    for (let y = 0; y < map.height; y += 36) {
      g.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.15})`;
      g.fillRect(0, y, map.width, 2);
      let x = -rnd() * 200;
      while (x < map.width) {
        const len = 120 + rnd() * 180;
        g.fillStyle = `rgba(${rnd() < 0.5 ? '255,220,180' : '0,0,0'},${rnd() * 0.05})`;
        g.fillRect(x, y + 2, len, 34);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + len, y, 2, 36);
        x += len;
      }
    }
  },
  carpet(g, map) {
    g.strokeStyle = 'rgba(160,110,60,.12)'; g.lineWidth = 2;
    for (let y = 0; y < map.height; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < map.width; x += 60) {
      g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 18, y); g.lineTo(x, y + 18); g.lineTo(x - 18, y); g.closePath(); g.stroke();
    }
    g.strokeStyle = 'rgba(200,150,80,.18)'; g.lineWidth = 6;
    g.strokeRect(70, 70, map.width - 140, map.height - 140);
  },
  tiles(g, map, rnd) {
    for (let y = 0; y < map.height; y += 40) for (let x = 0; x < map.width; x += 40) {
      g.fillStyle = `rgba(255,255,255,${rnd() * 0.025})`; g.fillRect(x, y, 40, 40);
    }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
    for (let x = 0; x < map.width; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, map.height); g.stroke(); }
    for (let y = 0; y < map.height; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(map.width, y); g.stroke(); }
  },
  hospital(g, map, rnd) {
    for (let y = 0; y < map.height; y += 50) for (let x = 0; x < map.width; x += 50) {
      g.fillStyle = `rgba(200,220,220,${0.02 + rnd() * 0.03})`; g.fillRect(x + 1, y + 1, 48, 48);
    }
    g.fillStyle = 'rgba(120,160,150,.12)'; g.fillRect(0, map.height - 70, map.width, 8); g.fillRect(0, 62, map.width, 8);
  },
  stone(g, map, rnd) {
    for (let y = 0; y < map.height; y += 46) {
      let x = -rnd() * 60;
      while (x < map.width) {
        const w = 50 + rnd() * 70;
        g.fillStyle = `rgba(${rnd() < 0.5 ? '255,240,200' : '0,0,0'},${0.03 + rnd() * 0.06})`;
        g.fillRect(x + 2, y + 2, w - 4, 42);
        x += w;
      }
    }
  },
};

Object.assign(FLOORS, {
  dirt(g, map, rnd) {
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(${rnd() < 0.5 ? '90,110,60' : '40,50,28'},${0.25 + rnd() * 0.3})`; g.lineWidth = 1.2;
      const x = rnd() * map.width, y = rnd() * map.height;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 6, y - 6 - rnd() * 6); g.stroke();
    }
    g.fillStyle = 'rgba(120,100,70,.12)'; // 竹林裡踩出來的小路
    g.beginPath(); g.moveTo(map.width / 2 - 40, map.height); g.bezierCurveTo(map.width * 0.3, map.height * 0.6, map.width * 0.7, map.height * 0.4, map.width / 2 + 30, 0);
    g.lineTo(map.width / 2 + 90, 0); g.bezierCurveTo(map.width * 0.75, map.height * 0.4, map.width * 0.35, map.height * 0.6, map.width / 2 + 40, map.height); g.fill();
  },
  straw(g, map, rnd) {
    for (let i = 0; i < 500; i++) {
      g.strokeStyle = `rgba(200,170,90,${0.08 + rnd() * 0.12})`; g.lineWidth = 1;
      const x = rnd() * map.width, y = rnd() * map.height, a = rnd() * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); g.stroke();
    }
  },
  paper(g, map, rnd) {
    g.strokeStyle = 'rgba(230,220,190,.05)'; g.lineWidth = 1;
    for (let x = 0; x < map.width; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, map.height); g.stroke(); }
    for (let y = 0; y < map.height; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(map.width, y); g.stroke(); }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(10,8,6,${rnd() * 0.35})`;
      g.beginPath(); g.arc(rnd() * map.width, rnd() * map.height, 1 + rnd() * 4, 0, Math.PI * 2); g.fill();
    }
  },
  water(g, map, rnd) {
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(150,180,210,${0.03 + rnd() * 0.05})`; g.lineWidth = 1.5;
      const x = rnd() * map.width, y = rnd() * map.height, w = 30 + rnd() * 80;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 4, x + w, y); g.stroke();
    }
    // 中線：一道像水面的反光
    const grad = g.createLinearGradient(map.width / 2 - 30, 0, map.width / 2 + 30, 0);
    grad.addColorStop(0, 'rgba(160,200,240,0)'); grad.addColorStop(0.5, 'rgba(160,200,240,.16)'); grad.addColorStop(1, 'rgba(160,200,240,0)');
    g.fillStyle = grad; g.fillRect(map.width / 2 - 30, 0, 60, map.height);
  },
});

const OBSTACLES = {
  crate(g, o) {
    g.fillStyle = '#4a3828'; g.fillRect(o.x, o.y, o.w, o.h);
    g.strokeStyle = '#2c2017'; g.lineWidth = 3;
    g.strokeRect(o.x + 1.5, o.y + 1.5, o.w - 3, o.h - 3);
    g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + o.w, o.y + o.h); g.moveTo(o.x + o.w, o.y); g.lineTo(o.x, o.y + o.h); g.stroke();
  },
  table(g, o) {
    g.fillStyle = '#3a2418'; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = '#6a2c2c'; g.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
    g.fillStyle = 'rgba(255,220,180,.06)'; g.fillRect(o.x + 4, o.y + 4, o.w - 8, 6);
  },
  furniture(g, o) {
    g.fillStyle = '#2b3038'; g.fillRect(o.x, o.y, o.w, o.h);
    g.strokeStyle = '#1a1d22'; g.lineWidth = 3; g.strokeRect(o.x + 1.5, o.y + 1.5, o.w - 3, o.h - 3);
  },
  wall(g, o) {
    g.fillStyle = '#0c0d10'; g.fillRect(o.x, o.y, o.w, o.h);
  },
  bed(g, o) {
    g.fillStyle = '#5c6166'; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = '#9aa0a4'; g.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
    g.fillStyle = '#c8cccd';
    const top = o.y < 400;
    g.fillRect(o.x + 10, top ? o.y + 8 : o.y + o.h - 30, o.w - 20, 22);
    g.fillStyle = 'rgba(0,0,0,.15)';
    g.fillRect(o.x + 4, top ? o.y + 40 : o.y + 4, o.w - 8, o.h - 48);
  },
  shelf(g, o) {
    g.fillStyle = '#3a2c1c'; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = 'rgba(0,0,0,.35)';
    for (let x = o.x + 30; x < o.x + o.w; x += 34) g.fillRect(x, o.y, 2, o.h);
    if (o.w === o.h) { // 中間的酒桶
      g.fillStyle = '#4a3622';
      g.beginPath(); g.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#22180f'; g.lineWidth = 3;
      g.beginPath(); g.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2 - 6, 0, Math.PI * 2); g.stroke();
    }
  },
};

Object.assign(OBSTACLES, {
  bamboo(g, o) {
    let seed = o.x * 7 + o.y;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 6; i++) {
      const x = o.x + 8 + rnd() * (o.w - 16), y = o.y + 8 + rnd() * (o.h - 16), r = 5 + rnd() * 4;
      g.fillStyle = '#2e3e22'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#4a6034'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r - 2, 0, Math.PI * 2); g.stroke();
    }
    g.strokeStyle = 'rgba(80,110,50,.35)'; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { // 垂下來的竹葉
      const a = rnd() * Math.PI * 2, cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (o.w * 0.8), cy + Math.sin(a) * (o.h * 0.8)); g.stroke();
    }
  },
  hay(g, o) {
    g.fillStyle = '#8a7440'; g.fillRect(o.x, o.y, o.w, o.h);
    g.strokeStyle = 'rgba(60,45,20,.6)'; g.lineWidth = 1;
    for (let y = o.y + 6; y < o.y + o.h; y += 6) { g.beginPath(); g.moveTo(o.x + 2, y); g.lineTo(o.x + o.w - 2, y + 2); g.stroke(); }
    g.strokeStyle = '#3a2a14'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(o.x + o.w * 0.3, o.y); g.lineTo(o.x + o.w * 0.3, o.y + o.h); g.moveTo(o.x + o.w * 0.7, o.y); g.lineTo(o.x + o.w * 0.7, o.y + o.h); g.stroke();
  },
  desk(g, o) {
    g.fillStyle = '#2a1c12'; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = '#d8cfb8'; g.fillRect(o.x + 30, o.y + 18, o.w - 110, o.h - 36);   // 攤開的宣紙
    g.strokeStyle = '#14110e'; g.lineWidth = 4; g.lineCap = 'round';                   // 紙上那條沒有眼睛的龍
    g.beginPath(); g.moveTo(o.x + 45, o.y + o.h / 2); g.bezierCurveTo(o.x + 80, o.y + 25, o.x + 110, o.y + o.h - 25, o.x + o.w - 95, o.y + o.h / 2); g.stroke();
    g.fillStyle = '#111'; g.fillRect(o.x + o.w - 60, o.y + 25, 34, 24);               // 硯台
    g.fillStyle = '#5a3a20'; g.fillRect(o.x + o.w - 55, o.y + 65, 4, 34);             // 毛筆
  },

  chair(g, o) { // 搖椅
    g.fillStyle = '#5a4230'; g.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
    g.strokeStyle = '#2c2017'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(o.x, o.y + 4); g.quadraticCurveTo(o.x + o.w / 2, o.y - 6, o.x + o.w, o.y + 4);
    g.moveTo(o.x, o.y + o.h - 4); g.quadraticCurveTo(o.x + o.w / 2, o.y + o.h + 6, o.x + o.w, o.y + o.h - 4); g.stroke();
    g.fillStyle = '#7a6a8a'; g.fillRect(o.x + 14, o.y + 14, o.w - 28, o.h - 28); // 椅墊上的毯子
  },
  pillar(g, o) {
    g.fillStyle = '#4a2a22'; g.beginPath(); g.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8a5a30'; g.lineWidth = 2; g.stroke();
  },
  bench(g, o) { // 醫院的候診椅與推床
    g.fillStyle = '#3d4a4c'; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = '#5a6a6c';
    for (let x = o.x + 6; x < o.x + o.w - 20; x += 58) g.fillRect(x, o.y + 6, 50, o.h - 12);
  },
});

const DECOR_UNDER = {
  rug(g, d) {
    g.fillStyle = 'rgba(110,50,50,.28)'; g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(200,160,110,.22)'; g.lineWidth = 3;
    g.beginPath(); g.arc(d.x, d.y, d.r - 10, 0, Math.PI * 2); g.stroke();
  },
};

const DECOR = {
  ink(g, d) {
    let seed = d.x + d.y;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = 'rgba(8,6,4,.5)';
    g.beginPath(); g.ellipse(d.x, d.y, 26, 16, rnd() * 3, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2, r = 28 + rnd() * 30;
      g.beginPath(); g.arc(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, 1 + rnd() * 4, 0, Math.PI * 2); g.fill();
    }
  },
  cane(g, d) { // 奶奶的拐杖：五個夢裡都有
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(d.x + 5, d.y - 16); g.lineTo(d.x + 13, d.y + 30); g.stroke();
    g.strokeStyle = '#b08a55'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(d.x, d.y + 28); g.lineTo(d.x, d.y - 18);
    g.arc(d.x + 7, d.y - 18, 7, Math.PI, 0); g.stroke();
  },
  bow(g, d) {
    g.strokeStyle = '#a07040'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(d.x - 70, d.y - 8); g.quadraticCurveTo(d.x, d.y + 34, d.x + 70, d.y - 8); g.stroke();
    g.strokeStyle = 'rgba(230,220,200,.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(d.x - 70, d.y - 8); g.lineTo(d.x + 70, d.y - 8); g.stroke();
    // 弓的影子落在地上，像一條蛇
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 9;
    g.beginPath(); g.moveTo(d.x - 60, d.y + 40); g.bezierCurveTo(d.x - 20, d.y + 80, d.x + 20, d.y + 30, d.x + 60, d.y + 70); g.stroke();
  },
  seats(g, d) { // 長桌兩側的空椅子
    g.fillStyle = '#3a2418';
    for (let x = d.x + 40; x < d.x + d.w - 20; x += 90) {
      g.fillRect(x, d.y - 30, 34, 22); g.fillRect(x, d.y + d.h + 8, 34, 22);
    }
  },
  whisper(g, d) {
    g.font = 'italic 15px serif'; g.textAlign = 'center';
    g.fillStyle = 'rgba(220,210,190,.28)'; g.fillText(d.text, d.x, d.y);
  },
  doorlight(g, d) { // 客廳門縫漏出來的光
    const grad = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, 130);
    grad.addColorStop(0, 'rgba(255,220,150,.28)'); grad.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = grad; g.fillRect(d.x - 130, d.y - 130, 260, 260);
  },
  doors(g, d, map) { // 走廊兩側一扇一扇的病房門
    g.fillStyle = '#2a3436';
    for (let x = 120; x < d.w; x += 210) { g.fillRect(x, 6, 70, 18); g.fillRect(x + 100, map.height - 24, 70, 18); }
  },
  stairs(g, d) {
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(200,180,140,${0.22 - i * 0.035})`;
      g.fillRect(d.x - 110, d.y - 14 + i * 14, 220, 10);
    }
  },
};

// ---------------- 目標物 ----------------
export function targetAnchor(t, map) {
  if (!t.side) return { x: t.x, y: t.y };
  const m = map.wall + 22;
  if (t.side === 'top') return { x: t.x, y: m };
  if (t.side === 'bottom') return { x: t.x, y: map.height - m };
  if (t.side === 'left') return { x: m, y: t.y };
  return { x: map.width - m, y: t.y };
}

export function drawTarget(ctx, t, kind, time) {
  ctx.save();
  if (kind === 'window') {
    const horiz = t.side === 'top' || t.side === 'bottom', L = 76, T = 20;
    ctx.translate(t.x, t.y);
    if (!horiz) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = t.done ? '#15100c' : '#3c4a5e';
    ctx.fillRect(-L / 2, -T / 2, L, T);
    if (!t.done) {
      const sway = Math.sin(time * 2.4 + t.x) * 6;
      ctx.fillStyle = 'rgba(200,190,170,.35)';
      ctx.fillRect(-L / 2, -T / 2, 14 + sway, T); ctx.fillRect(L / 2 - 14 + sway, -T / 2, 14 - sway, T);
    } else {
      ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -T / 2); ctx.lineTo(0, T / 2); ctx.stroke();
    }
    ctx.strokeStyle = '#4a3828'; ctx.lineWidth = 3; ctx.strokeRect(-L / 2, -T / 2, L, T);
  } else if (kind === 'cup') {
    ctx.translate(t.x, t.y);
    if (t.done) {
      ctx.fillStyle = 'rgba(120,10,20,.6)';
      ctx.beginPath(); ctx.ellipse(10, 4, 16, 7, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(1.3);
    }
    const wob = t.done ? 0 : Math.sin(time * 3 + t.x) * 0.6;
    ctx.fillStyle = '#b8a070';
    ctx.beginPath(); ctx.ellipse(wob, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.done ? '#3a2a1a' : '#5a0f18';
    ctx.beginPath(); ctx.ellipse(wob, -0.5, 5, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    if (!t.done) { // 酒裡的小蛇
      ctx.strokeStyle = 'rgba(20,30,10,.9)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-3, 0);
      ctx.quadraticCurveTo(0, -2 + Math.sin(time * 6) * 1.5, 3, 0); ctx.stroke();
    }
  } else if (kind === 'key') {
    if (!t.done) {
      ctx.translate(t.x, t.y); ctx.rotate(0.6);
      ctx.strokeStyle = '#c9a74a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-5, 0, 4, 0, Math.PI * 2); ctx.moveTo(-1, 0); ctx.lineTo(9, 0); ctx.moveTo(6, 0); ctx.lineTo(6, 3); ctx.moveTo(9, 0); ctx.lineTo(9, 3); ctx.stroke();
    }
  } else if (kind === 'candle') {
    ctx.translate(t.x, t.y);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(2, 8, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9d2c0'; ctx.fillRect(-4, -8, 8, 16);
    ctx.fillStyle = '#222'; ctx.fillRect(-0.5, -11, 1, 3);
    if (t.done) {
      const f = 1 + Math.sin(time * 18 + t.x) * 0.15;
      ctx.fillStyle = 'rgba(255,190,90,.95)';
      ctx.beginPath(); ctx.ellipse(0, -15, 3 * f, 6 * f, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,220,.95)';
      ctx.beginPath(); ctx.ellipse(0, -14, 1.4, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'jar') {
    const r = (t.rattle || 0) * 2;
    ctx.translate(t.x + (Math.random() - 0.5) * r, t.y + (Math.random() - 0.5) * r);
    if (t.broken) {
      ctx.fillStyle = '#5a4026';
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.lineTo(Math.cos(a + 0.3) * 18, Math.sin(a + 0.3) * 18); ctx.fill();
      }
      ctx.fillStyle = 'rgba(30,20,10,.8)'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(3, 6, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a1c10'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
      if (t.done) {
        ctx.fillStyle = '#e8d28a'; ctx.fillRect(-11, -4, 22, 8);
        ctx.fillStyle = '#a01818'; ctx.fillRect(-9, -1, 18, 2);
        ctx.fillRect(-1, -4, 2, 8);
      }
    }
  } else if (kind === 'lantern') {
    ctx.translate(t.x, t.y);
    ctx.strokeStyle = '#3a4a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, -20); ctx.stroke();
    ctx.rotate(Math.sin(time * 1.6 + t.x) * 0.12);
    ctx.fillStyle = t.done ? '#e0503a' : '#5a1e18';
    ctx.beginPath(); ctx.ellipse(0, -6, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(-4, -17, 8, 3); ctx.fillRect(-4, 3, 8, 3);
    if (t.done) { ctx.fillStyle = 'rgba(255,215,130,.85)'; ctx.beginPath(); ctx.ellipse(0, -6, 3, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'patch') {
    const horiz = t.side === 'top' || t.side === 'bottom';
    ctx.translate(t.x, t.y);
    if (!horiz) ctx.rotate(Math.PI / 2);
    if (!t.done) {
      ctx.fillStyle = '#050403';
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(150,130,110,.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { // 洞裡伸出來扭動的手指
        const w = Math.sin(time * 5 + i * 1.3) * 3;
        ctx.beginPath(); ctx.moveTo(i * 8, 4); ctx.lineTo(i * 8 + w, -6); ctx.stroke();
      }
    } else {
      ctx.translate((t.tear || 0) * 3 * (Math.random() - 0.5), 0);
      ctx.fillStyle = '#6a4e30'; ctx.fillRect(-32, -9, 64, 8); ctx.fillRect(-32, 1, 64, 8);
      ctx.fillStyle = '#c8c8c8';
      for (const x of [-26, 24]) { ctx.fillRect(x, -6, 2, 2); ctx.fillRect(x, 4, 2, 2); }
      if (t.tear > 0) {
        ctx.strokeStyle = `rgba(210,50,30,${t.tear})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-10, -9); ctx.lineTo(-4, 0); ctx.lineTo(-12, 9); ctx.moveTo(12, -9); ctx.lineTo(6, 2); ctx.stroke();
      }
    }
  } else if (kind === 'clock') {
    ctx.translate(t.x, t.y);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(3, 17, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3420'; ctx.fillRect(-11, -18, 22, 34);
    ctx.fillStyle = '#d8ccb0'; ctx.beginPath(); ctx.arc(0, -8, 8, 0, Math.PI * 2); ctx.fill();
    const a1 = t.done ? 2.2 : time * 3 + t.x, a2 = t.done ? -1 : time * 0.25 + t.y;
    ctx.strokeStyle = '#1a120c'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(Math.cos(a1) * 6, -8 + Math.sin(a1) * 6);
    ctx.moveTo(0, -8); ctx.lineTo(Math.cos(a2) * 4, -8 + Math.sin(a2) * 4); ctx.stroke();
    const pend = t.done ? 0 : Math.sin(time * 3 + t.x) * 0.5;
    ctx.strokeStyle = '#b89a50';
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(Math.sin(pend) * 8, 2 + Math.cos(pend) * 11); ctx.stroke();
  } else if (kind === 'scroll') {
    ctx.translate(t.x, t.y);
    if (!t.done) {
      ctx.fillStyle = '#d8cfb8'; ctx.fillRect(-11, -20, 22, 40);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-13, -22, 26, 3); ctx.fillRect(-13, 19, 26, 3);
      ctx.strokeStyle = 'rgba(20,16,12,.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -14); ctx.bezierCurveTo(8, -8, -8, 2, 6, 12); ctx.stroke();
    } else {
      ctx.fillStyle = '#c8bea6'; ctx.fillRect(-13, -3, 26, 7);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-15, -3, 3, 7); ctx.fillRect(12, -3, 3, 7);
      ctx.fillStyle = '#a01818'; ctx.fillRect(-1, -3, 2, 7);
    }
  } else if (kind === 'cover') {
    ctx.translate(t.x, t.y);
    ctx.fillStyle = '#3a2c20'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 19, 0, 0, Math.PI * 2); ctx.fill();
    if (!t.done) {
      const g = ctx.createLinearGradient(-10, -16, 10, 16);
      g.addColorStop(0, '#8a96a2'); g.addColorStop(0.5, '#d0d8e2'); g.addColorStop(1, '#5a6470');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(20,20,30,.6)'; ctx.beginPath(); ctx.ellipse(0, 3, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#e8e2d4';
      ctx.beginPath(); ctx.moveTo(-16, -21); ctx.lineTo(16, -21); ctx.lineTo(18, 23); ctx.quadraticCurveTo(0, 17, -18, 23); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// 黑暗中還沒完成的目標會微微閃光，讓玩家找得到
export function drawTargetGlint(ctx, t, kind, time) {
  if (t.done || t.broken || kind === 'window') return;
  const a = 0.25 + Math.sin(time * 2.5 + t.x * 0.01) * 0.15;
  const color = { key: '255,220,120', cup: '255,140,120', jar: '220,190,120', lantern: '255,120,90', patch: '200,160,110', clock: '240,220,170', scroll: '235,225,200', cover: '190,215,240' }[kind] || '230,230,255';
  const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 14);
  g.addColorStop(0, `rgba(${color},${a})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(t.x, t.y, 14, 0, Math.PI * 2); ctx.fill();
}

// ---------------- 玩家 ----------------
export function drawPlayer(ctx, p, invuln) {
  if (invuln > 0 && Math.floor(invuln * 12) % 2 === 0) return;
  const bob = p.moving ? Math.sin(p.step) * 1.2 : 0;
  const sway = p.moving ? Math.sin(p.step * 0.5) * 1.5 : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.ellipse(0, 13, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  // 長睡衣
  ctx.fillStyle = '#c9cdd0';
  ctx.beginPath();
  ctx.moveTo(-4, -7 + bob); ctx.lineTo(4, -7 + bob);
  ctx.lineTo(7 + sway, 13); ctx.lineTo(-7 + sway, 13); ctx.closePath(); ctx.fill();
  // 垂著的手
  ctx.strokeStyle = '#c9cdd0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -5 + bob); ctx.lineTo(-7 - sway * 0.5, 5 + bob);
  ctx.moveTo(4, -5 + bob); ctx.lineTo(7 - sway * 0.5, 5 + bob); ctx.stroke();
  // 沒有五官的臉
  ctx.fillStyle = '#ddd3c6';
  ctx.beginPath(); ctx.ellipse(0, -13 + bob, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
  // 長髮
  ctx.fillStyle = '#17120f';
  ctx.beginPath();
  ctx.ellipse(0, -15 + bob, 6, 5.5, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(6 - p.face * 2, -2 + bob); ctx.lineTo(3 - p.face * 3, -8 + bob);
  ctx.lineTo(-3 - p.face * 3, -8 + bob); ctx.lineTo(-6 - p.face * 2, -2 + bob);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// 紙條與記憶（記憶是一張泛黃的舊照片）
export function drawNote(ctx, n) {
  ctx.save(); ctx.translate(n.x, n.y);
  if (n.kind === 'memory') {
    ctx.rotate(-0.15);
    ctx.fillStyle = n.read ? '#8f8672' : '#efe6cf'; ctx.fillRect(-12, -10, 24, 20);
    ctx.fillStyle = n.read ? '#4a4038' : '#5a4638'; ctx.fillRect(-9, -7, 18, 11);
    ctx.fillStyle = 'rgba(240,225,200,.55)';
    ctx.beginPath(); ctx.arc(-2, -2, 2.4, 0, Math.PI * 2); ctx.arc(4, -1, 1.7, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.rotate(0.2);
    ctx.fillStyle = n.read ? '#8a8070' : '#e6dcc3'; ctx.fillRect(-9, -11, 18, 22);
    ctx.fillStyle = 'rgba(60,40,30,.5)';
    for (let i = 0; i < 4; i++) ctx.fillRect(-6, -7 + i * 5, 12, 1);
  }
  ctx.restore();
}

// ---------------- 道具特效 ----------------
export function drawFx(ctx, f) {
  const k = f.t / f.life;
  ctx.save();
  if (f.kind === 'harmonica' || f.kind === 'charm') {
    const color = f.kind === 'charm' ? '255,210,120' : '200,220,255';
    for (let i = 0; i < 3; i++) {
      const kk = clamp(k * 1.4 - i * 0.18, 0, 1);
      if (kk <= 0 || kk >= 1) continue;
      ctx.strokeStyle = `rgba(${color},${(1 - kk) * 0.7})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, 20 + kk * 260, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (f.kind === 'matches') {
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 + f.t * 0.6, rr = 20 + (i % 5) * 18 + f.t * 12;
      ctx.fillStyle = `rgba(150,140,130,${0.18 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr - f.t * 8, 26 + (i % 3) * 8, 0, Math.PI * 2); ctx.fill();
    }
    if (f.t < 1.2) {
      ctx.fillStyle = `rgba(255,170,60,${1 - f.t / 1.2})`;
      ctx.beginPath(); ctx.arc(f.x, f.y - 6, 4, 0, Math.PI * 2); ctx.fill();
    }
  } else if (f.kind === 'salt') {
    for (let i = 0; i < 26; i++) {
      const a = i * 0.9, rr = k * (60 + (i % 7) * 18);
      ctx.fillStyle = `rgba(240,240,240,${1 - k})`;
      ctx.fillRect(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr, 2, 2);
    }
  } else if (f.kind === 'mirror') {
    ctx.fillStyle = `rgba(255,255,240,${(1 - k) * 0.5})`;
    ctx.beginPath(); ctx.arc(f.x, f.y, 40 + k * 200, 0, Math.PI * 2); ctx.fill();
  } else if (f.kind === 'noise') {
    ctx.strokeStyle = `rgba(220,220,230,${(1 - k) * 0.35})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.3 + k * 0.7), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
