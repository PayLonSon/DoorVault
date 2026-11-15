// 杯弓蛇影：你停下來，牠才會動。打翻五隻酒杯才能醒來。
export const snakeInCup = {
  id: 'snake-in-cup',
  idiom: '杯弓蛇影',
  door: { hint: '門後傳來杯子輕碰的聲音，像有人在敬酒。', color: '#3a1d1d', glow: '#ff9a7a' },
  tags: { weak: ['light', 'reflect'], immune: ['smoke', 'fire', 'sound'], provoked: ['holy'] },
  intro: ['長桌上擺滿了酒杯。', '每一杯酒裡，都有一條蛇在游。', '你一動，牠就不動。'],
  tip: '你移動時牠不會動，停下來牠才會靠近。',
  objective: { label: '打翻酒杯', kind: 'cup', holdSeconds: 0.9 },
  timeLimit: 150,
  theme: { floor: 'carpet', base: '#2a1416', obstacle: 'table', darkness: 0.96 },
  map: {
    width: 1200, height: 800, wall: 24,
    playerStart: { x: 600, y: 700 },
    obstacles: [
      { x: 250, y: 250, w: 700, h: 60 }, { x: 250, y: 500, w: 700, h: 60 },
      { x: 1060, y: 380, w: 60, h: 50 },
      { x: 110, y: 110, w: 40, h: 40 }, { x: 1050, y: 110, w: 40, h: 40 },
      { x: 110, y: 650, w: 40, h: 40 }, { x: 1050, y: 650, w: 40, h: 40 },
    ],
    targets: [
      { x: 330, y: 262 }, { x: 700, y: 298 }, { x: 420, y: 512 }, { x: 860, y: 548 }, { x: 1090, y: 392 },
    ],
    notes: [
      { x: 180, y: 420, text: '古書上說：杯裡的蛇，其實是牆上那把弓的影子。' },
      { x: 1000, y: 200, text: '燈一亮，影子就會現出原形。' },
      { x: 600, y: 420, text: '不要求神拜佛。你越相信牠存在，牠就長得越大。' },
    ],
  },
  monster: {
    behavior: 'stillness', radius: 20, start: { x: 600, y: 90 },
    speed: 125, retreatSpeed: 45, speedPerObjective: 12, fearOnHit: 22,
  },
  messages: {
    effective: '光照過去，蛇縮回成一道弓的影子。', none: '牠毫無反應。', provoked: '牠變得更大了！',
    toggleProvoked: '牠變得更大了！',
    progress: ['酒灑了一地。', '桌上的蛇，少了一條。', '其他的杯子，開始自己晃動。', '只剩最後一隻。'],
  },
  endings: {
    win: '最後一隻杯子倒下，酒灑了一地。\n地上只剩一把弓的影子。\n你醒來時，牆上掛著奶奶的拐杖，影子正微微晃動。',
    caught: '你站得太久了。\n冰冷的鱗片纏上你的腳踝，一圈，又一圈。',
    timeout: '酒杯又一隻一隻自己斟滿。\n這場宴席，永遠不會散。',
  },
  fragment: '那天晚上，我以為牆上的影子是蛇。其實那是奶奶的拐杖。',
};
