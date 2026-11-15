// 鏡花水月：倒影在房間的另一半，慢半拍學你的動作。蓋上鏡子才能醒來。
export const mirrorMoon = {
  id: 'mirror-moon',
  idiom: '鏡花水月',
  door: { hint: '門上的鏡子裡，你的倒影比你先轉過頭。', color: '#1c2430', glow: '#c8dcf0' },
  tags: { weak: ['purify', 'sound'], immune: ['smoke'], provoked: ['light', 'reflect'] },
  intro: ['奶奶的廳堂，鏡子都還沒蓋上。', '地板亮得像水面。', '水裡的你，正看著水外的你。'],
  tip: '倒影在房間另一半，慢半拍學你。別在中線附近停下來。',
  objective: { label: '蓋上鏡子', kind: 'cover', holdSeconds: 1.2 },
  theme: { floor: 'water', base: '#10151c', obstacle: 'furniture', darkness: 0.9 },
  // 廳堂：左右完全對稱，中線像一道水面；奶奶的搖椅擺在正中央
  map: {
    width: 1200, height: 760, wall: 24,
    playerStart: { x: 200, y: 640 },
    obstacles: [
      { x: 250, y: 250, w: 90, h: 90 }, { x: 860, y: 250, w: 90, h: 90 },
      { x: 420, y: 500, w: 120, h: 50, type: 'table' }, { x: 660, y: 500, w: 120, h: 50, type: 'table' },
      { x: 60, y: 60, w: 60, h: 60, type: 'pillar' }, { x: 1080, y: 60, w: 60, h: 60, type: 'pillar' },
      { x: 60, y: 660, w: 60, h: 60, type: 'pillar' }, { x: 1080, y: 660, w: 60, h: 60, type: 'pillar' },
      { x: 572, y: 330, w: 56, h: 56, type: 'chair' },
    ],
    decor: [{ type: 'cane', x: 640, y: 300 }],
    targets: [{ x: 600, y: 60 }, { x: 170, y: 170 }, { x: 1030, y: 400 }, { x: 420, y: 690 }, { x: 990, y: 690 }],
    notes: [
      { x: 300, y: 430, text: '倒影會學你，只是慢了一點。在中間停下來，它就會碰到你。' },
      { x: 900, y: 430, text: '撒鹽或出聲，水面會起漣漪，倒影就碎了。別拿光照它。' },
      { x: 680, y: 440, kind: 'memory', text: '奶奶走後，媽媽把家裡的鏡子都蓋上了。她說這樣，奶奶回來時才不會迷路。' },
    ],
  },
  monster: {
    behavior: 'mirror', radius: 18, start: { x: 1000, y: 640 },
    delay: 0.9, delayPerObjective: 0.1, minDelay: 0.45, fearOnHit: 22,
  },
  messages: {
    effective: '水面起了漣漪，倒影碎成一片一片。', none: '倒影學你做了一樣的動作。', provoked: '光一照，倒影朝你伸出了手！',
    toggleProvoked: '倒影朝你伸出了手！',
    progress: ['鏡子蓋上了。', '倒影學得越來越快。', '只剩最後一面。'],
  },
  endings: {
    win: '最後一面鏡子蓋上，地板不再發亮。\n你醒來，看見浴室的鏡子蒙著一層霧。\n霧上有一個手印，比你的手大一點。',
    caught: '倒影握住了你的手。\n從今以後，換你在鏡子裡看著外面。',
    timeout: '天亮了，鏡子還開著。\n你分不清，醒來的是哪一個。',
  },
  fragment: '我後來偷偷掀開過一面鏡子。鏡子裡，奶奶的搖椅還在晃。',
};
