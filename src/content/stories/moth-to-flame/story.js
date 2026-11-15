// 飛蛾撲火：怪物會被光吸引。關上四扇窗才能醒來。
export const mothToFlame = {
  id: 'moth-to-flame',
  idiom: '飛蛾撲火',
  door: { hint: '門縫透出閃爍的光，翅膀一下一下撞著門板。', color: '#3b2f24', glow: '#fff1b8' },
  tags: { weak: ['sound', 'smoke'], immune: ['salt', 'holy'], provoked: ['light'] },
  intro: ['閣樓的燈泡，一直在閃。', '四扇窗戶全開著，風灌了進來。', '黑暗裡，有東西在拍動翅膀。'],
  objective: { label: '關上窗戶', kind: 'window', holdSeconds: 1.4 },
  timeLimit: 180,
  theme: { floor: 'planks', base: '#211a15', obstacle: 'crate', darkness: 0.965, lamp: { x: 600, y: 380 } },
  map: {
    width: 1200, height: 800, wall: 24,
    playerStart: { x: 150, y: 690 },
    obstacles: [
      { x: 420, y: 150, w: 120, h: 70 }, { x: 760, y: 210, w: 70, h: 150 }, { x: 300, y: 450, w: 90, h: 90 },
      { x: 640, y: 560, w: 160, h: 60 }, { x: 980, y: 300, w: 90, h: 110 }, { x: 150, y: 380, w: 60, h: 130 },
      { x: 930, y: 620, w: 70, h: 70 },
    ],
    targets: [
      { x: 260, y: 12, side: 'top' }, { x: 1188, y: 560, side: 'right' },
      { x: 880, y: 788, side: 'bottom' }, { x: 12, y: 230, side: 'left' },
    ],
    notes: [
      { x: 480, y: 250, text: '奶奶說：飛蛾是找不到回家路的東西，牠們會一直追著光。' },
      { x: 1030, y: 450, text: '閣樓的窗戶，睡前一定要關好。不然會有東西飛進來。' },
      { x: 250, y: 600, text: '我一害怕就吹口琴，奶奶就會端著蚊香進來。牠們最討厭那個煙。' },
    ],
  },
  monster: {
    behavior: 'moth', radius: 22, start: { x: 680, y: 380 },
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
