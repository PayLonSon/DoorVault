// 畫龍點睛：從畫裡爬出來的墨龍身體很長，碰到哪裡都會痛。捲起畫卷才能醒來。
export const dragonEyes = {
  id: 'dragon-eyes',
  idiom: '畫龍點睛',
  door: { hint: '門上畫著一條龍，只是沒有眼睛。', color: '#2a2620', glow: '#e8e0c8' },
  tags: { weak: ['reflect'], immune: ['smoke', 'holy'], provoked: ['fire'] },
  intro: ['奶奶的書房，掛滿了沒畫完的畫。', '畫裡的龍不見了。', '地上，有一道很長很長的墨痕在移動。'],
  tip: '牠的身體很長，碰到哪裡都會痛。看準空隙再穿過去。',
  objective: { label: '捲起畫卷', kind: 'scroll', holdSeconds: 1.1 },
  theme: { floor: 'paper', base: '#2a261e', obstacle: 'shelf', darkness: 0.88 },
  // 書房：中央一張大書桌，兩側書架，畫卷掛在四面牆邊
  map: {
    width: 1200, height: 820, wall: 24,
    playerStart: { x: 150, y: 740 },
    obstacles: [
      { x: 470, y: 340, w: 260, h: 120, type: 'desk' },
      { x: 40, y: 60, w: 200, h: 50 }, { x: 960, y: 60, w: 200, h: 50 },
      { x: 300, y: 600, w: 50, h: 50, type: 'pillar' }, { x: 900, y: 560, w: 50, h: 50, type: 'pillar' },
      { x: 1060, y: 380, w: 40, h: 200, type: 'furniture' },
    ],
    decor: [{ type: 'ink', x: 600, y: 600 }, { type: 'ink', x: 250, y: 300 }, { type: 'cane', x: 762, y: 330 }],
    targets: [{ x: 400, y: 52 }, { x: 800, y: 52 }, { x: 1150, y: 700 }, { x: 56, y: 420 }, { x: 650, y: 770 }],
    notes: [
      { x: 300, y: 250, text: '墨畫出來的東西，最怕看見自己。' },
      { x: 950, y: 250, text: '這裡全是紙，千萬別點火。' },
      { x: 790, y: 300, kind: 'memory', text: '奶奶教我寫毛筆字。她畫了一條龍，說等我不怕黑了，再讓我替牠點上眼睛。' },
    ],
  },
  monster: {
    behavior: 'dragon', radius: 14, start: { x: 900, y: 650 },
    headSpeed: 92, chaseSpeed: 122, enragedSpeed: 158, detectRadius: 170,
    segments: 26, segmentsPerObjective: 6, speedPerObjective: 6, fearOnHit: 22,
  },
  messages: {
    effective: '龍在鏡子裡看見自己，嚇得縮回了頭。', none: '墨龍毫無反應。', provoked: '紙燒起來了，墨龍狂舞！',
    toggleProvoked: '墨龍狂舞！',
    progress: ['畫卷捲起來了。', '墨痕又長了一截。', '只剩最後一卷。'],
  },
  endings: {
    win: '最後一卷畫收好，墨痕縮回了紙裡。\n你醒來，書桌上攤著那張畫。\n龍的眼睛，不知道被誰點上了。',
    caught: '墨纏住你，一圈又一圈。\n你變成了畫裡的一筆。',
    timeout: '天亮了，牆上多了一張畫。\n畫裡是一個沒有臉的孩子。',
  },
  fragment: '奶奶留下的那張畫，龍還是沒有眼睛。我一直不敢替牠點上。',
};
