# 三扇門｜惡夢

一款 5 到 10 分鐘就能玩完的網頁恐怖遊戲。每次入睡都是新的一局，不存檔。

**流程**：入睡 → 床邊三樣道具選一樣 → 選一扇門 → 在惡夢裡達成醒來條件 → 結算時揭曉每樣道具對這個惡夢的效果（有效／無效／反效果）。

目前內容：1 個故事「飛蛾閣樓」、6 種道具。

## 操作

| 平台 | 移動 | 互動（關窗按住、讀紙條） | 使用道具 |
|---|---|---|---|
| 電腦 | WASD／方向鍵 | 按住 E | 空白鍵或 Q |
| 手機 | 左半邊拖曳 | 按住「互動」 | 點「道具」 |

## 部署到 GitHub Pages

不需要建置步驟，原始檔就能直接執行。

1. 建立新的 repository，把這個資料夾的內容全部推上去（包含 `.nojekyll`）。
2. 到 repository 的 **Settings → Pages**。
3. **Source** 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，按 Save。
4. 約一分鐘後，網址會是 `https://<你的帳號>.github.io/<repo 名稱>/`。

本機測試時，因為使用 ES Module，不能直接雙擊 `index.html`，要開一個本機伺服器：

```bash
python3 -m http.server 8000
# 然後打開 http://localhost:8000
```

想要單一檔案版本（可直接雙擊開啟或傳給別人），執行：

```bash
node tools/build-single.mjs   # 產生 dist/nightmare-doors.html
```

## 專案結構

```
index.html                 頁面骨架（畫布、選單層、HUD、觸控按鈕）
style.css                  全部樣式
src/
├─ main.js                 啟動、場景切換、遊戲迴圈
├─ core/
│  ├─ run.js               一局的狀態：抽道具、抽門（只存在記憶體）
│  ├─ effects.js           道具效果判定（比對標籤）
│  ├─ rng.js               可重現的亂數（seed）
│  ├─ input.js             鍵盤與觸控
│  └─ audio.js             程序化音效（Web Audio，不需要音檔）
├─ scenes/
│  ├─ menus.js             標題、選道具、選門、開場、結算
│  └─ dream.js             夢境本體（讀故事資料來建立房間與怪物）
├─ world/backdrop.js       選單背景
└─ content/
   ├─ items.js             道具清單
   └─ stories/
      ├─ index.js          故事清單（新增故事在這裡加一行）
      └─ moth-attic/story.js   故事：飛蛾閣樓
tools/build-single.mjs     打包成單一 HTML
```

## 道具效果怎麼判定

每個道具有標籤（`tags`），每個故事有三組標籤：

```js
tags: {
  weak:     ['sound', 'smoke'],  // 有效：怪物逃開
  immune:   ['salt', 'holy'],    // 無效：沒有反應
  provoked: ['light'],           // 反效果：怪物暴怒
}
```

判定順序是 **反效果 → 無效 → 有效**，都沒對到就算無效。所以新增道具時，只要給它標籤，所有舊故事會自動判斷效果。

抽道具時，程式會保證三樣中至少有一樣對其中一扇門有效。

## 新增一個恐怖故事

1. 複製 `src/content/stories/moth-attic/` 成新資料夾，例如 `drowned-hall/`。
2. 修改 `story.js`：標題、門的暗示、弱點標籤、開場字幕、地圖、紙條、怪物參數、結局。
3. 在 `src/content/stories/index.js` 加一行：

```js
import { drownedHall } from './drowned-hall/story.js';
export const STORIES = [mothAttic, drownedHall];
```

故事超過三個時，每局會隨機抽三扇門。

目前醒來條件只實作了 `close-windows`（關上所有窗戶）。要做新的條件（例如「把時鐘調到同一時間」），在 `scenes/dream.js` 的 `updateInteract` 加入對應的判斷即可。

## 不存檔的設計

所有狀態都放在 `run.js` 產生的物件裡，沒有使用 localStorage 或 Cookie。結算畫面會顯示「夢的編號」（seed），之後可以加上「輸入編號重做同一場夢」的功能。
