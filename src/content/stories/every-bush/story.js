// 草木皆兵：竹林裡的稻草人只有一個是真的。點亮燈籠才能醒來。
export const everyBush = {
  id: 'every-bush',
  idiom: '草木皆兵',
  door: { hint: '門外是一片竹林，每一根竹子後面，都站著一個人。', color: '#1f2a1a', glow: '#c8e0a0' },
  tags: { weak: ['sound'], immune: ['salt', 'smoke'], provoked: ['fire'] },
  intro: ['奶奶家後面的竹林。', '竹子之間，站著好多個稻草人。', '其中一個，剛剛動了一下。'],
  tip: '稻草人裡只有一個是真的。仔細看，誰在呼吸。',
  objective: { label: '點亮燈籠', kind: 'lantern', holdSeconds: 1.1 },
  theme: { floor: 'dirt', base: '#161a10', obstacle: 'bamboo', darkness: 0.9 },
  // 竹林：竹叢散落，稻草人站在竹叢之間，燈籠掛在小路邊
  map: {
    width: 1300, height: 860, wall: 24,
    playerStart: { x: 650, y: 800 },
    obstacles: [
      { x: 200, y: 150, w: 60, h: 60 }, { x: 520, y: 120, w: 50, h: 50 }, { x: 880, y: 170, w: 70, h: 60 },
      { x: 1120, y: 260, w: 60, h: 60 }, { x: 120, y: 420, w: 60, h: 70 }, { x: 420, y: 380, w: 55, h: 55 },
      { x: 760, y: 430, w: 60, h: 60 }, { x: 1060, y: 520, w: 60, h: 60 }, { x: 280, y: 640, w: 60, h: 60 },
      { x: 900, y: 700, w: 60, h: 55 },
    ],
    decor: [{ type: 'cane', x: 772, y: 690 }],
    targets: [{ x: 100, y: 100 }, { x: 650, y: 320 }, { x: 1200, y: 120 }, { x: 150, y: 780 }, { x: 1190, y: 420 }],
    notes: [
      { x: 380, y: 470, text: '奶奶說：稻草人不會呼吸。會呼吸的那個，不是稻草人。' },
      { x: 990, y: 250, text: '竹林裡千萬別點火。一燒起來，它們全都會醒。' },
      { x: 720, y: 700, kind: 'memory', text: '小時候我在竹林迷路，是奶奶吹著口琴來找我。我跟著那首曲子走回了家。' },
    ],
  },
  monster: {
    behavior: 'decoys', radius: 18, start: { x: 330, y: 250 },
    figures: [
      { x: 330, y: 250 }, { x: 700, y: 230 }, { x: 1000, y: 340 }, { x: 230, y: 540 },
      { x: 560, y: 520 }, { x: 880, y: 570 }, { x: 450, y: 720 }, { x: 1180, y: 700 },
    ],
    lungeRange: 115, lungeSpeed: 185, speedPerObjective: 8, enragedSpeed: 175, swapEvery: 12, fearOnHit: 24,
  },
  messages: {
    effective: '熟悉的曲子響起，那個稻草人縮了一下。就是它。', none: '稻草人們一動也不動。', provoked: '火光一亮，它們全都轉過頭來！',
    toggleProvoked: '它們全都轉過頭來！',
    progress: ['燈籠亮了。', '有一個稻草人，換了位置。', '只剩最後一盞。'],
  },
  endings: {
    win: '最後一盞燈籠亮起，竹林裡的稻草人全都倒下了。\n你醒來時，窗外竹葉沙沙作響。\n有一陣口琴聲，從很遠的地方傳來。',
    caught: '你走近那個稻草人，它抬起了頭。\n草帽底下，沒有臉。',
    timeout: '天亮了，竹林裡多了一個稻草人。\n它穿著你的睡衣。',
  },
  fragment: '奶奶走的那天，我躲進竹林不肯回家。每一個稻草人，看起來都像在等我。',
};
