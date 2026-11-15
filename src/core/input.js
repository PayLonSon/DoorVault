// 輸入：鍵盤（WASD／方向鍵、E 互動、空白鍵道具）與手機觸控
// 左手模式：搖桿在右、按鈕在左
let lefty = false;
export function setLefty(on) { lefty = on; document.getElementById('touch').classList.toggle('lefty', on); }
export const isLefty = () => lefty;

export function createInput() {
  const keys = new Set();
  const state = {
    move: { x: 0, y: 0 },
    interact: false,     // 按住
    itemPressed: false,  // 單次觸發（每幀讀取後清除）
    touchMove: { x: 0, y: 0 },
    touchInteract: false,
  };

  addEventListener('keydown', (e) => {
    if (e.repeat) { keys.add(e.code); return; }
    keys.add(e.code);
    if (e.code === 'KeyE' || e.code === 'KeyQ') state.itemPressed = true;
    if (e.code === 'Space' && !e.target.closest?.('button')) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // ---- 觸控：左半邊任意位置拖曳成搖桿 ----
  const stick = document.getElementById('stick');
  const knob = document.getElementById('stick-knob');
  let stickId = null, ox = 0, oy = 0;
  const R = 50;

  addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (stickId === null && (lefty ? t.clientX > innerWidth * 0.45 : t.clientX < innerWidth * 0.55) && !t.target.closest('.tbtn, .panel')) {
        stickId = t.identifier; ox = t.clientX; oy = t.clientY;
        stick.style.display = 'block';
        stick.style.left = ox + 'px'; stick.style.top = oy + 'px';
        knob.style.transform = 'translate(-50%, -50%)';
      }
    }
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== stickId) continue;
      let dx = t.clientX - ox, dy = t.clientY - oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      // 內圈是靜步（慢走、聲音小），推到外圈才是正常速度
      const mag = d / R < 0.62 ? 0.45 : 1;
      state.touchMove.x = d > 6 ? (dx / (Math.hypot(dx, dy) || 1)) * mag : 0;
      state.touchMove.y = d > 6 ? (dy / (Math.hypot(dx, dy) || 1)) * mag : 0;
    }
  }, { passive: true });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        stickId = null; stick.style.display = 'none';
        state.touchMove.x = 0; state.touchMove.y = 0;
      }
    }
  };
  addEventListener('touchend', endTouch);
  addEventListener('touchcancel', endTouch);

  const btnAct = document.getElementById('btn-act');
  const btnItem = document.getElementById('btn-item');
  const press = (el, on) => el.classList.toggle('down', on);
  btnAct.addEventListener('pointerdown', (e) => { e.preventDefault(); state.touchInteract = true; press(btnAct, true); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
    btnAct.addEventListener(ev, () => { state.touchInteract = false; press(btnAct, false); }));
  btnItem.addEventListener('pointerdown', (e) => { e.preventDefault(); state.itemPressed = true; press(btnItem, true); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
    btnItem.addEventListener(ev, () => press(btnItem, false)));

  return {
    // 每幀呼叫一次，回傳這一幀的輸入
    read() {
      let x = 0, y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x || y) {
        const d = Math.hypot(x, y);
        // 按住 Shift 輕輕走（聲音比較小）
        const k = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 0.45 : 1;
        x = x / d * k; y = y / d * k;
      }
      else { x = state.touchMove.x; y = state.touchMove.y; }
      const out = {
        x, y,
        interact: keys.has('Space') || keys.has('Enter') || state.touchInteract,
        item: state.itemPressed,
      };
      state.itemPressed = false;
      return out;
    },
    reset() {
      keys.clear(); state.itemPressed = false; state.touchInteract = false;
      state.touchMove.x = 0; state.touchMove.y = 0;
    },
  };
}

export const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
