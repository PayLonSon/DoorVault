// 夜長夢多：鐘每響一次，黑暗裡就多一個你。停下時鐘才能醒來。
export const longNight = {
  id: 'long-night',
  idiom: '夜長夢多',
  door: { hint: '門後有很多時鐘在走，每一個的時間都不一樣。', color: '#2a2018', glow: '#f0d8a0' },
  tags: { weak: ['light'], immune: ['holy', 'salt'], provoked: ['reflect', 'sound'] },
  intro: ['奶奶房間裡掛滿了時鐘。', '每響一次，黑暗裡就多一個人影。', '它們都穿著你的睡衣。'],
  tip: '鐘每響一次，它們就多一個。停下一個時鐘，就會少一個。',
  objective: { label: '停下時鐘', kind: 'clock', holdSeconds: 1.2 },
  theme: { floor: 'planks', base: '#1c1612', obstacle: 'furniture', darkness: 0.9 },
  // 奶奶的臥房：床、衣櫃、書桌，時鐘掛在牆上、立在地毯中間
  map: {
    width: 1000, height: 900, wall: 24,
    playerStart: { x: 500, y: 820 },
    obstacles: [
      { x: 420, y: 60, w: 160, h: 130, type: 'bed' }, { x: 40, y: 380, w: 70, h: 170 },
      { x: 780, y: 600, w: 150, h: 70, type: 'table' }, { x: 250, y: 600, w: 90, h: 60, type: 'crate' },
      { x: 620, y: 80, w: 50, h: 50 },
    ],
    decor: [{ type: 'rug', x: 500, y: 450, r: 140 }, { type: 'cane', x: 692, y: 150 }],
    targets: [{ x: 150, y: 120 }, { x: 850, y: 140 }, { x: 500, y: 420 }, { x: 140, y: 740 }, { x: 880, y: 450 }],
    notes: [
      { x: 300, y: 300, text: '它們怕光。天一亮，就全都不見了。' },
      { x: 700, y: 770, text: '別吹口琴，也別照鏡子。聲音和倒影，會讓它們變多。' },
      { x: 730, y: 190, kind: 'memory', text: '奶奶的鐘每一個都慢五分鐘。她說這樣，早上就可以多陪我五分鐘。' },
    ],
  },
  monster: {
    behavior: 'swarm', radius: 14, start: { x: 500, y: 300 },
    spawnEvery: 22, maxBodies: 6, wanderSpeed: 45, chaseSpeed: 92, detectRadius: 170,
    speedPerObjective: 5, fearOnHit: 18,
  },
  messages: {
    effective: '光照過去，人影一個個退回了黑暗。', none: '它們毫無反應。', provoked: '又多了一個！',
    toggleProvoked: '又多了一個！',
    progress: ['時鐘停了，一個人影跟著消失。', '剩下的鐘，走得更快了。', '只剩最後一個。'],
  },
  endings: {
    win: '最後一個時鐘停了，屋子裡安靜下來。\n你醒來，床頭的鬧鐘停在 3:47。\n那是奶奶走的時間。',
    caught: '它們圍了上來，每一個都長著你的臉。\n其中一個，替你躺回了床上。',
    timeout: '鐘又響了。\n這一次，多出來的那一個是你。',
  },
  fragment: '奶奶房間的鐘，在她走的那一刻全都停了。爸爸說，只是電池沒電。',
};
