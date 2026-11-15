// 道具清單
// kind: 'pulse' 每按一次發動一次（有次數）；'toggle' 按一次開、再按一次關
// tags: 用來和惡夢的弱點／抗性／反效果比對
export const ITEMS = [
  { id: 'flashlight', name: '手電筒', icon: '🔦', kind: 'toggle', tags: ['light'],
    desc: '照亮黑暗，看得更遠。再按一次關掉。' },
  { id: 'mirror', name: '小鏡子', icon: '🪞', kind: 'pulse', uses: 3, tags: ['light', 'reflect'],
    desc: '把光反射出去，閃一下。' },
  { id: 'harmonica', name: '口琴', icon: '🎵', kind: 'pulse', uses: 3, tags: ['sound'],
    desc: '小時候害怕時吹的曲子。' },
  { id: 'matches', name: '火柴盒', icon: '🔥', kind: 'pulse', uses: 3, tags: ['smoke', 'fire'],
    desc: '點燃後會冒出一陣濃煙。' },
  { id: 'salt', name: '一把鹽', icon: '🧂', kind: 'pulse', uses: 3, tags: ['salt', 'purify'],
    desc: '奶奶說，鹽能趕走不乾淨的東西。' },
  { id: 'charm', name: '護身符', icon: '🧿', kind: 'pulse', uses: 3, tags: ['holy'],
    desc: '廟裡求來的，舉起來念一句。' },
];
