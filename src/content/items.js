// 道具清單
// kind: 'pulse' 每按一次發動一次（有次數）；'toggle' 按一次開、再按一次關
// tags: 用來和惡夢的弱點／抗性／反效果比對
export const ITEMS = [
  { id: 'flashlight', name: '手電筒', icon: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14l6 6 4-4-6-6z"/><path d="M10 10l3-5 6 6-5 3"/><path d="M17 3v2M21 7h-2M20 4l-1.5 1.5"/></svg>', kind: 'toggle', tags: ['light'],
    desc: '照亮黑暗，看得更遠。再按一次關掉。' },
  { id: 'mirror', name: '小鏡子', icon: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M12 15v7M9.5 7.5q1.5-2 3.5-2"/></svg>', kind: 'pulse', uses: 3, tags: ['light', 'reflect'],
    desc: '把光反射出去，閃一下。' },
  { id: 'harmonica', name: '口琴', icon: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 10.5v3M10.3 10.5v3M13.7 10.5v3M17 10.5v3"/></svg>', kind: 'pulse', uses: 3, tags: ['sound'],
    desc: '小時候害怕時吹的曲子。' },
  { id: 'matches', name: '火柴盒', icon: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="12" height="8"/><path d="M4 14h12M18.2 4.5L13 11"/><circle cx="18.6" cy="3.8" r="1.2" fill="currentColor"/></svg>', kind: 'pulse', uses: 3, tags: ['smoke', 'fire'],
    desc: '點燃後會冒出一陣濃煙。' },
  { id: 'salt', name: '一把鹽', icon: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20h14M8 20q4-8 8 0"/><g fill="currentColor" stroke="none"><circle cx="12" cy="5" r=".9"/><circle cx="10" cy="9" r=".9"/><circle cx="14" cy="10" r=".9"/><circle cx="12" cy="13" r=".9"/></g></svg>', kind: 'pulse', uses: 3, tags: ['salt', 'purify'],
    desc: '奶奶說，鹽能趕走不乾淨的東西。' },
  { id: 'charm', name: '護身符', icon: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h8l2 3v11H6V9z"/><circle cx="12" cy="3.8" r="1.4"/><path d="M12 11v6M10 13h4"/></svg>', kind: 'pulse', uses: 3, tags: ['holy'],
    desc: '廟裡求來的，舉起來念一句。' },
];
