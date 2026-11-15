// 請君入甕：五個甕裡，有一個藏著東西。封住四個甕口才能醒來。
export const intoTheUrn = {
  id: 'into-the-urn',
  idiom: '請君入甕',
  door: { hint: '門後飄出一股酸味，有東西在裡面輕輕敲著。', color: '#2b2a1c', glow: '#d8c27a' },
  tags: { weak: ['fire'], immune: ['holy', 'light', 'reflect'], provoked: ['salt'] },
  intro: ['地窖裡排滿了醃菜的甕。', '其中一個甕，從裡面被敲了一下。', '咚。'],
  tip: '五個甕只要封住四個。仔細聽，哪一個在敲。',
  objective: { label: '封住甕口', kind: 'jar', holdSeconds: 1.2, need: 4 },
  timeLimit: 160,
  theme: { floor: 'stone', base: '#1b1914', obstacle: 'shelf', darkness: 0.965 },
  map: {
    width: 1200, height: 800, wall: 24,
    playerStart: { x: 600, y: 700 },
    obstacles: [
      { x: 200, y: 200, w: 200, h: 40 }, { x: 800, y: 200, w: 200, h: 40 },
      { x: 200, y: 560, w: 200, h: 40 }, { x: 800, y: 560, w: 200, h: 40 },
      { x: 560, y: 360, w: 80, h: 80 },
    ],
    targets: [{ x: 300, y: 300 }, { x: 900, y: 300 }, { x: 300, y: 500 }, { x: 900, y: 500 }, { x: 600, y: 140 }],
    notes: [
      { x: 120, y: 400, text: '每一缸都封得好好的。只有一缸，夜裡會自己敲。' },
      { x: 1080, y: 400, text: '聽見敲聲的那一缸，千萬別碰。' },
      { x: 600, y: 600, text: '裡面的東西怕火。可是千萬別往缸裡撒鹽，那是牠的。' },
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
