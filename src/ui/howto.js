import { isTouchDevice } from '../core/input.js';
import { NIGHT_SECONDS, DOORS_PER_NIGHT } from '../core/run.js';

// 玩法介紹：分頁卡片，可從標題畫面與暫停畫面打開。
// 左右滑動、方向鍵或按鈕翻頁，Esc 或右上角關閉。

const S = (w, h, inner) => `<svg class="howto-art" viewBox="0 0 ${w} ${h}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const door = (x, label, lit) => `
  <rect x="${x}" y="20" width="44" height="76" rx="2" ${lit ? 'stroke="#c44"' : ''}/>
  <rect x="${x + 12}" y="28" width="20" height="40" stroke-width="1" opacity=".6"/>
  <text x="${x + 22}" y="44" font-size="9" fill="currentColor" stroke="none" text-anchor="middle" writing-mode="tb">${label}</text>
  <circle cx="${x + 36}" cy="64" r="2" fill="currentColor"/>
  <line x1="${x}" y1="97" x2="${x + 44}" y2="97" stroke="#f3e2b0" stroke-width="2.5" opacity=".8"/>`;

const ART = {
  goal: S(300, 130, `
    ${door(20, '第一扇', true)}
    <path d="M72 58h22M88 52l6 6-6 6"/>
    ${door(102, '第二扇')}
    <path d="M154 58h22M170 52l6 6-6 6"/>
    ${door(184, '第三扇')}
    <circle cx="268" cy="58" r="20"/><path d="M268 46v12l8 6"/>
    <text x="268" y="96" font-size="11" fill="currentColor" stroke="none" text-anchor="middle">5:00</text>`),
  touch: S(300, 150, `
    <rect x="40" y="6" width="220" height="138" rx="16"/>
    <circle cx="100" cy="98" r="30" stroke-dasharray="3 4"/>
    <circle cx="100" cy="98" r="18" stroke-dasharray="2 3" opacity=".6"/>
    <circle cx="112" cy="94" r="9" fill="currentColor" fill-opacity=".25"/>
    <text x="100" y="56" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">左邊拖曳移動</text>
    <circle cx="228" cy="106" r="16"/><text x="228" y="110" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">互動</text>
    <circle cx="190" cy="90" r="13"/><text x="190" y="93" font-size="8" fill="currentColor" stroke="none" text-anchor="middle">道具</text>
    <text x="210" y="56" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">右下按住、點擊</text>`),
  keys: S(300, 130, `
    ${[['W', 52, 20], ['A', 22, 50], ['S', 52, 50], ['D', 82, 50]].map(([k, x, y]) => `<rect x="${x}" y="${y}" width="26" height="26" rx="4"/><text x="${x + 13}" y="${y + 17}" font-size="11" fill="currentColor" stroke="none" text-anchor="middle">${k}</text>`).join('')}
    <text x="65" y="98" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">移動</text>
    <rect x="22" y="104" width="86" height="20" rx="4"/><text x="65" y="118" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">Shift 慢走</text>
    <rect x="132" y="50" width="100" height="26" rx="4"/><text x="182" y="67" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">空白鍵（按住）</text>
    <text x="182" y="98" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">互動</text>
    <rect x="248" y="50" width="26" height="26" rx="4"/><text x="261" y="67" font-size="11" fill="currentColor" stroke="none" text-anchor="middle">E</text>
    <text x="261" y="98" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">道具</text>`),
  hold: S(300, 130, `
    <rect x="40" y="40" width="70" height="20" rx="2"/><path d="M75 40v20" opacity=".5"/>
    <text x="75" y="84" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">靠近目標</text>
    <path d="M122 50h22M138 44l6 6-6 6"/>
    <circle cx="190" cy="50" r="22" opacity=".25"/>
    <path d="M190 28a22 22 0 1 1-19 33" stroke="#e8dfcf" stroke-width="3"/>
    <text x="190" y="54" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">按住</text>
    <text x="190" y="94" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">圈滿就完成</text>
    <path d="M232 50h22M248 44l6 6-6 6"/>
    <path d="M268 42l6 8 12-14" stroke="#7fc08f" stroke-width="2.5"/>`),
  items: S(300, 130, `
    ${[['有效', '#2d5a3a', 20], ['無效', '#4a4a4a', 110], ['反效果', '#8a2323', 200]].map(([t, c, x]) => `
      <rect x="${x}" y="70" width="80" height="26" rx="3" fill="${c}" stroke="none"/>
      <text x="${x + 40}" y="88" font-size="12" fill="#f0e8dc" stroke="none" text-anchor="middle">${t}</text>`).join('')}
    <circle cx="60" cy="34" r="16"/><path d="M52 34h16M60 26v16" opacity=".5"/>
    <path d="M150 20v28M142 30h16" opacity=".8"/><rect x="138" y="18" width="24" height="32" rx="2"/>
    <path d="M232 24l14 14-10 10-14-14z"/><path d="M246 38l6-10 10 10-10 6" opacity=".7"/>
    <text x="150" y="120" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">同一樣道具，在不同的門效果不同</text>`),
  fear: S(300, 130, `
    <text x="30" y="34" font-size="11" fill="currentColor" stroke="none">恐懼</text>
    <rect x="66" y="25" width="200" height="10" opacity=".4"/>
    <rect x="66" y="25" width="140" height="10" fill="#c33" stroke="none"/>
    <circle cx="90" cy="88" r="28" fill="currentColor" fill-opacity=".1"/>
    <circle cx="90" cy="88" r="5" fill="currentColor"/>
    <text x="90" y="128" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">怕得越多，看得越少</text>
    <circle cx="210" cy="88" r="14" fill="currentColor" fill-opacity=".05"/>
    <circle cx="210" cy="88" r="5" fill="currentColor"/>
    <circle cx="244" cy="80" r="2" fill="#f44" stroke="none"/><circle cx="252" cy="80" r="2" fill="#f44" stroke="none"/>`),
  grow: S(300, 130, `
    ${[0, 1, 2].map((i) => `<rect x="${30 + i * 82}" y="16" width="70" height="70" rx="3" ${i === 1 ? 'stroke="#c44"' : 'opacity=".5"'}/>`).join('')}
    <path d="M52 62l10-10 6 6 12-14" />
    <path d="M147 44s5-9 18-9 18 9 18 9-5 9-18 9-18-9-18-9z"/><circle cx="165" cy="44" r="4"/>
    <path d="M249 66s-12-8-12-18a7 7 0 0112-4 7 7 0 0112 4c0 10-12 18-12 18z"/>
    <text x="150" y="112" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">每過一扇門，選一樣成長</text>`),
  tips: S(300, 130, `
    <circle cx="60" cy="56" r="20" fill="#f3d9a0" fill-opacity=".15" stroke="none"/>
    <rect x="50" y="46" width="20" height="20" rx="2"/>
    <text x="60" y="100" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">會發光的是目標</text>
    <rect x="132" y="42" width="28" height="22" rx="1" transform="rotate(-8 146 53)" stroke="#e99"/>
    <text x="146" y="100" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">紅光是記憶</text>
    <path d="M222 70c6-14 2-24 10-30M236 70c4-10 4-18 10-24" opacity=".7"/>
    <text x="236" y="100" font-size="10" fill="currentColor" stroke="none" text-anchor="middle">腳步聲會被聽見</text>`),
};

function pages() {
  const touch = isTouchDevice();
  const min = Math.round(NIGHT_SECONDS / 60);
  return [
    { title: '你在惡夢裡', art: ART.goal, body: `天亮之前（${min} 分鐘），連續走過<b>${DOORS_PER_NIGHT} 扇門</b>，才能真正醒來。<br>恐懼滿了會驚醒，時間到了，天就亮了。` },
    { title: '怎麼操作', art: touch ? ART.touch : ART.keys, body: touch
      ? '左半邊任意位置按住拖曳就能移動，搖桿停在<b>內圈</b>是靜步。<br>右下的<b>互動鍵</b>要按住，會顯示現在能做什麼；<b>道具鍵</b>點一下使用。<br>暫停畫面可以切換左手模式。'
      : '<b>WASD</b> 或方向鍵移動，按住 <b>Shift</b> 慢慢走。<br>按住<b>空白鍵</b>互動，按 <b>E</b> 使用道具。' },
    { title: '完成目標', art: ART.hold, body: '每扇門有自己的醒來條件：關窗、打翻酒杯、補上破洞……<br>靠近目標後<b>按住</b>互動，等圈填滿。放開的話，進度會慢慢退回去。' },
    { title: '找出怪物的規則', art: ART.goal.replace('5:00', '？'), body: '每扇門的怪物只有<b>一條規則</b>：有的怕光、有的只聽聲音、有的你停下來才會動。<br>門上的成語和那一句暗示是線索，房間裡的紙條會告訴你更多。' },
    { title: '道具三選一', art: ART.items, body: '入睡前，床邊有三樣東西，只能帶一樣，陪你走完三扇門。<br>它可能<b>有效</b>、<b>無效</b>，也可能是<b>反效果</b>。<br>先看門上的暗示，再決定走哪一扇。' },
    { title: '恐懼', art: ART.fear, body: '怪物越近，恐懼越高；被碰到會一口氣升很多。<br>恐懼越高，看得越少。過門後只會退掉一部分。<br>找到奶奶的<b>記憶照片</b>，會比較不害怕。' },
    { title: '慢慢變強', art: ART.grow, body: '每走出一扇門，可以從三種成長裡選一樣：腳步更輕、走得更快、看得更遠……<br>每扇門也會留下一塊<b>記憶碎片</b>。全部的門都走過，會看到最後的真相。' },
    { title: '小提醒', art: ART.tips, body: '黑暗裡微微發光的是目標和紙條，走近紙條會自動打開。<br>越裡面的門越難，時間要省著用。<br>不存檔：重新整理頁面，一切從頭開始。' },
  ];
}

let el = null, index = 0, list = [], onClose = null, touchX = null;

function render() {
  const p = list[index];
  el.querySelector('.howto-page').innerHTML = `
    <div class="howto-step">${index + 1} / ${list.length}</div>
    <h2>${p.title}</h2>
    ${p.art}
    <p class="howto-body">${p.body}</p>`;
  el.querySelector('.howto-dots').innerHTML = list.map((_, i) => `<i class="${i === index ? 'on' : ''}" data-i="${i}"></i>`).join('');
  el.querySelector('#howto-prev').disabled = index === 0;
  el.querySelector('#howto-next').textContent = index === list.length - 1 ? '開始吧' : '下一頁';
}

function go(i) {
  if (i >= list.length) { closeHowto(); return; }
  index = Math.max(0, i);
  render();
}

function onKey(e) {
  if (!el || el.classList.contains('hidden')) return;
  if (e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); go(index + 1); }
  else if (e.code === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(index - 1); }
  else if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); closeHowto(); }
}

export function openHowto(close) {
  onClose = close || null;
  list = pages();
  index = 0;
  if (!el) {
    el = document.getElementById('howto');
    el.querySelector('#howto-prev').onclick = () => go(index - 1);
    el.querySelector('#howto-next').onclick = () => go(index + 1);
    el.querySelector('#howto-close').onclick = () => closeHowto();
    el.querySelector('.howto-dots').onclick = (e) => { if (e.target.dataset.i) go(+e.target.dataset.i); };
    el.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    });
    addEventListener('keydown', onKey, true);
  }
  el.classList.remove('hidden');
  render();
}

export function closeHowto() {
  if (!el) return;
  el.classList.add('hidden');
  const cb = onClose;
  onClose = null;
  cb?.();
}

export const isHowtoOpen = () => !!el && !el.classList.contains('hidden');
