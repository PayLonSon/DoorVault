// 飛蛾撲火：怪物會被光吸引。關上四扇窗才能醒來。
export const mothToFlame = {
  id: 'moth-to-flame',
  idiom: '飛蛾撲火',
  door: { hint: '門縫透出閃爍的光，翅膀一下一下撞著門板。', color: '#3b2f24', glow: '#fff1b8' },
  tags: { weak: ['sound', 'smoke'], immune: ['salt', 'holy'], provoked: ['light'] },
  intro: ['閣樓的燈泡，一直在閃。', '四扇窗戶全開著，風灌了進來。', '黑暗裡，有東西在拍動翅膀。'],
  objective: { label: '關上窗戶', kind: 'window', holdSeconds: 1.4 },
  timeLimit: 180,
  theme: { floor: 'planks', base: '#211a15', obstacle: 'crate', darkness: 0.9, lamp: { x: 550, y: 380 } },
  // 奶奶的閣樓：床、衣櫃、搖椅、舊木箱，燈泡吊在正中央
  map: {
    width: 1100, height: 760, wall: 24,
    playerStart: { x: 120, y: 700 },
    obstacles: [
      { x: 820, y: 70, w: 90, h: 150, type: 'bed' },
      { x: 400, y: 40, w: 150, h: 60, type: 'furniture' },
      { x: 700, y: 300, w: 56, h: 56, type: 'chair' },
      { x: 260, y: 430, w: 90, h: 70 }, { x: 640, y: 560, w: 120, h: 60 },
      { x: 150, y: 540, w: 70, h: 110 }, { x: 940, y: 380, w: 80, h: 90 },
    ],
    decor: [{ type: 'cane', x: 928, y: 150 }, { type: 'rug', x: 550, y: 380, r: 120 }],
    targets: [
      { x: 300, y: 12, side: 'top' }, { x: 1088, y: 560, side: 'right' },
      { x: 800, y: 748, side: 'bottom' }, { x: 12, y: 240, side: 'left' },
    ],
    notes: [
      { x: 470, y: 250, text: '奶奶說：飛蛾是找不到回家路的東西，牠們會一直追著光。' },
      { x: 250, y: 620, text: '我一害怕就吹口琴，奶奶就會端著蚊香進來。牠們最討厭那個煙。' },
      { x: 950, y: 260, kind: 'memory', text: '奶奶的拐杖還靠在床邊。她總是坐在搖椅上，等我睡著才關燈。' },
    ],
  },
  monster: {
    behavior: 'moth', radius: 22, start: { x: 630, y: 380 },
    hoverRadius: 90, detectRadius: 150, loseRadius: 300,
    chaseSpeed: 108, speedPerObjective: 10, enragedSpeed: 175, fearOnHit: 24,
  },
  messages: {
    effective: '翅膀聲退開了……牠怕這個。', none: '牠毫無反應。', provoked: '牠被激怒了！',
    toggleProvoked: '光一亮，翅膀聲朝你衝過來！',
    progress: ['窗戶關上了。', '翅膀聲變得焦躁。', '只剩最後一扇。'],
  },
  endings: {
    win: '最後一扇窗關上，翅膀聲停了。\n你在自己的床上醒來，檯燈旁停著一隻小小的飛蛾。\n牠的翅膀上，有一塊像眼睛的花紋，正看著你。',
    caught: '燈泡啪地熄滅。\n翅膀聲貼上了你的耳朵……\n你沒有醒來。',
    timeout: '窗外始終沒有天亮。\n你還在閣樓裡，數著翅膀聲。',
  },
  fragment: '奶奶的房間在閣樓。那顆燈泡壞了很久，一直沒有人去修。',
};
