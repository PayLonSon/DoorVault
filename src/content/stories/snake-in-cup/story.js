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
  theme: { floor: 'carpet', base: '#2a1416', obstacle: 'table', darkness: 0.9 },
  // 除夕的宴客廳：一張長桌，北牆上掛著一把弓，蛇就從弓的影子裡出來
  map: {
    width: 1400, height: 620, wall: 24,
    playerStart: { x: 700, y: 540 },
    obstacles: [
      { x: 250, y: 270, w: 900, h: 80, type: 'table' },
      { x: 1260, y: 110, w: 60, h: 50, type: 'table' },
      { x: 120, y: 120, w: 40, h: 40, type: 'pillar' }, { x: 120, y: 460, w: 40, h: 40, type: 'pillar' },
      { x: 1240, y: 460, w: 40, h: 40, type: 'pillar' },
    ],
    decor: [{ type: 'bow', x: 700, y: 36 }, { type: 'cane', x: 800, y: 44 }, { type: 'seats', x: 250, y: 270, w: 900, h: 80 }],
    targets: [
      { x: 330, y: 285 }, { x: 560, y: 335 }, { x: 800, y: 285 }, { x: 1040, y: 335 }, { x: 1290, y: 145 },
    ],
    notes: [
      { x: 190, y: 310, text: '杯裡的蛇，其實是牆上那把弓的影子。燈一亮，影子就會現出原形。' },
      { x: 1200, y: 310, text: '不要求神拜佛。你越相信牠存在，牠就長得越大。' },
      { x: 860, y: 120, kind: 'memory', text: '那年除夕，奶奶的位子空著。她的拐杖掛在牆上，影子落進了我的杯子裡。' },
    ],
  },
  monster: {
    behavior: 'stillness', radius: 20, start: { x: 700, y: 70 },
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
