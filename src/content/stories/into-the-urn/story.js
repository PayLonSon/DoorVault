// 請君入甕：五個甕裡，有一個藏著東西。封住四個甕口才能醒來。
export const intoTheUrn = {
  id: 'into-the-urn',
  idiom: '請君入甕',
  door: { hint: '門後飄出一股酸味，有東西在裡面輕輕敲著。', color: '#2b2a1c', glow: '#d8c27a' },
  tags: { weak: ['fire'], immune: ['holy', 'light', 'reflect'], provoked: ['salt'] },
  intro: ['地窖裡排滿了醃菜的甕。', '其中一個甕，從裡面被敲了一下。', '咚。'],
  tip: '五缸只要封住四缸。仔細聽，哪一缸在敲。',
  objective: { label: '封住甕口', kind: 'jar', holdSeconds: 1.2, need: 4 },
  timeLimit: 160,
  theme: { floor: 'stone', base: '#1b1914', obstacle: 'shelf', darkness: 0.9 },
  // 地窖本身就是一個甕：你從窄窄的甕口走下來，肚子裡擺著五缸醃菜
  map: {
    width: 1000, height: 900, wall: 24,
    playerStart: { x: 500, y: 90 },
    obstacles: [
      { x: 24, y: 24, w: 326, h: 220, wall: true }, { x: 650, y: 24, w: 326, h: 220, wall: true },
      { x: 24, y: 244, w: 120, h: 90, wall: true }, { x: 856, y: 244, w: 120, h: 90, wall: true },
      { x: 24, y: 780, w: 110, h: 96, wall: true }, { x: 866, y: 780, w: 110, h: 96, wall: true },
      { x: 420, y: 340, w: 160, h: 36, type: 'shelf' },
      { x: 150, y: 540, w: 36, h: 120, type: 'shelf' }, { x: 814, y: 540, w: 36, h: 120, type: 'shelf' },
    ],
    decor: [{ type: 'stairs', x: 500, y: 44 }, { type: 'cane', x: 610, y: 320 }],
    targets: [{ x: 250, y: 430 }, { x: 750, y: 430 }, { x: 300, y: 690 }, { x: 700, y: 690 }, { x: 500, y: 560 }],
    notes: [
      { x: 210, y: 360, text: '每一缸都封得好好的。只有一缸夜裡會自己敲，聽見敲聲的那一缸，千萬別碰。' },
      { x: 500, y: 810, text: '裡面的東西怕火。可是千萬別往缸裡撒鹽，那是牠的。' },
      { x: 660, y: 400, kind: 'memory', text: '奶奶說，梅子要醃滿三年才能開。今年是第三年。她的拐杖還掛在架子旁。' },
    ],
  },
  monster: {
    behavior: 'urn', radius: 22, burstAfter: 75,
    chaseSpeed: 115, speedPerObjective: 8, enragedSpeed: 175, loseRadius: 320, fearOnHit: 26,
  },
  messages: {
    effective: '火光一晃，牠縮著身子退開了。', none: '牠毫無反應。', provoked: '牠嘗到了鹽，發狂了！',
    toggleProvoked: '牠發狂了！',
    progress: ['符紙貼上了甕口。', '敲打聲停了一下，又開始了。', '只剩最後一個。'],
  },
  endings: {
    win: '最後一張符紙貼上甕口。\n敲打聲停了。\n你醒來，聞到廚房飄來醃梅子的酸味。',
    caught: '甕口很窄，可是你還是被塞了進去。\n蓋子闔上之前，你看見外面站著另一個你。',
    timeout: '甕一個接一個裂開。\n你終於明白，「請君入甕」的「君」是誰。',
  },
  fragment: '奶奶醃的那缸梅子，到現在都沒有人敢打開。',
};
