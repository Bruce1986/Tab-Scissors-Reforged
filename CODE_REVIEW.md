# Tab Scissors Reforged — Code Review Report

**審查日期：** 2026-04-04
**審查範圍：** 全專案原始碼（src/、test/、manifest.json、package.json）

---

## 狀態更新（2026-04-12）

本文件是 2026-04-04 的歷史審查報告，不代表目前仍未修復的問題清單。

- 報告中的主要問題已於後續 PR review 修正循環中逐步處理完成。
- 最新一輪 Gemini review 已明確回覆：`I have no further feedback to provide.`
- 最近一次功能相關驗證結果為 `npm test`，共 `31/31` tests passing。

### 後續修正摘要

- popup 與 service worker 的 message routing 已補齊，並加入 success / error response。
- manifest 已補上 popup 與 icons 設定，且有對應測試。
- popup 已加入 DOM 防呆、錯誤處理、inline 狀態訊息與重複操作保護。
- `tabManagement.js` 已補齊錯誤傳遞、target window 驗證與 incognito 相容性。
- service worker 已使用每視窗 lock 避免 split / merge 競爭同一個 window state。

---

## 問題總覽

| # | 問題 | 嚴重度 | 檔案 |
|---|------|--------|------|
| 1 | Popup 訊息沒有被 Service Worker 接收 | 🔴 嚴重 | service-worker.js, popup.js |
| 2 | manifest.json 的 action 缺少 default_popup 宣告 | 🟡 中等 | manifest.json |
| 3 | popup.js 缺少錯誤處理 | 🟡 中等 | popup.js |
| 4 | popup.js 缺少 DOM 元素 null 檢查 | 🟡 中等 | popup.js |
| 5 | splitTabs 缺少 try-catch | 🟢 輕微 | tabManagement.js |
| 6 | 缺少擴充套件圖示（icons） | 🟢 輕微 | manifest.json |
| 7 | Chrome API 不存在時缺少警告日誌 | 🟢 輕微 | service-worker.js |

---

## 🔴 嚴重問題

### 1. Popup 按鈕完全失效 — 缺少 onMessage 監聽器

**檔案：** `src/service-worker.js`、`src/popup.js`

**問題描述：**
`popup.js` 透過 `chrome.runtime.sendMessage()` 發送 `{ action: 'split' }` 和 `{ action: 'merge' }` 訊息給 service worker，但 `service-worker.js` 從未註冊 `chrome.runtime.onMessage` 監聽器。結果是使用者點擊彈出視窗中的按鈕時，**什麼事都不會發生**。目前只有鍵盤快捷鍵（Alt+S / Alt+A）和直接點擊擴充套件圖示能觸發功能。

**影響：** Popup UI 形同虛設，按鈕完全無作用。

**建議修正：**
在 `service-worker.js` 中加入訊息監聽器：

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'split') {
    splitTabs(message.windowId);
  } else if (message.action === 'merge') {
    mergeAllWindows(message.windowId);
  }
});
```

同時也需要為此監聽器補上對應的單元測試。

---

## 🟡 中等問題

### 2. manifest.json action 區塊缺少 default_popup

**檔案：** `src/manifest.json`

**問題描述：**
目前 manifest 的 `action` 區塊只有 `default_title`，沒有宣告 `default_popup: "popup.html"`。需注意的是：

- 如果不宣告 `default_popup`，Chrome 會觸發 `action.onClicked` 事件（目前用來呼叫 splitTabs）。
- 如果宣告了 `default_popup`，Chrome **不會**觸發 `action.onClicked`，而是顯示彈出視窗。

這兩種行為互斥。目前的設計是：點擊圖示直接執行 split，同時也有 popup UI。如果專案期望讓使用者透過 popup 選擇操作，則需要：

1. 在 manifest 加入 `"default_popup": "popup.html"`
2. 移除 `action.onClicked` 監聽器（因為它不會再被觸發）

如果期望保留「點擊圖示直接 split」的行為，則 popup.html 形同無用，應考慮移除或改用其他觸發方式。

**建議修正（假設要啟用 popup）：**

```json
"action": {
  "default_title": "Tab Scissors Reforged",
  "default_popup": "popup.html"
}
```

並移除 `service-worker.js` 中的 `chrome.action.onClicked` 監聽器。

---

### 3. popup.js 缺少錯誤處理

**檔案：** `src/popup.js`

**問題描述：**
`chrome.windows.getCurrent()` 是非同步呼叫，但完全沒有 try-catch 包裹。如果 API 呼叫失敗，會產生未捕捉的 Promise rejection，使用者不會看到任何錯誤提示，也難以除錯。

**建議修正：**

```javascript
splitBtn.addEventListener('click', async () => {
  try {
    const currentWindow = await chrome.windows.getCurrent();
    chrome.runtime.sendMessage({ action: 'split', windowId: currentWindow.id });
  } catch (error) {
    console.error('Split action failed:', error);
  }
});
```

Merge 按鈕的事件處理也應做相同處理。

---

### 4. popup.js 缺少 DOM 元素 null 檢查

**檔案：** `src/popup.js`

**問題描述：**
`document.getElementById('split')` 和 `document.getElementById('merge')` 的回傳值直接呼叫 `.addEventListener()`，沒有檢查是否為 null。若 DOM 結構有誤或 ID 不匹配，會拋出 `TypeError: Cannot read property 'addEventListener' of null`。

**建議修正：**

```javascript
const splitBtn = document.getElementById('split');
const mergeBtn = document.getElementById('merge');

if (splitBtn) {
  splitBtn.addEventListener('click', async () => { /* ... */ });
}
if (mergeBtn) {
  mergeBtn.addEventListener('click', async () => { /* ... */ });
}
```

---

## 🟢 輕微問題

### 5. splitTabs 缺少 try-catch

**檔案：** `src/tabManagement.js`

**問題描述：**
`splitTabs` 函式呼叫多個 Chrome API（`tabs.query`、`windows.create`、`tabs.move`），但沒有用 try-catch 包裹。任何一個 API 失敗都會導致未捕捉的例外。相較之下，`mergeAllWindows` 已有部分錯誤處理（`windows.remove` 有 try-catch），但其他 API 呼叫也同樣缺少保護。

**建議修正：**
為 `splitTabs` 整個函式加上 try-catch，並考慮為 `mergeAllWindows` 中的 `tabs.query` 和 `tabs.move` 也加上錯誤處理。

---

### 6. 缺少擴充套件圖示

**檔案：** `src/manifest.json`

**問題描述：**
manifest 中沒有宣告 `icons` 欄位。Chrome 工具列會顯示預設的灰色拼圖圖示，讓使用者難以辨識此擴充套件。

**建議修正：**
提供 16x16、48x48、128x128 三種尺寸的圖示，並在 manifest 中宣告：

```json
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

---

### 7. Chrome API 不存在時缺少警告日誌

**檔案：** `src/service-worker.js`

**問題描述：**
`globalThis.chrome?.action?.onClicked` 等防禦性寫法很好，但當 API 不存在時完全靜默，在開發或除錯階段不容易發現問題。

**建議修正：**

```javascript
if (globalThis.chrome?.action) {
  chrome.action.onClicked.addListener(handleActionClick);
} else {
  console.warn('[Tab Scissors] chrome.action API is not available.');
}
```

---

## 測試層面的建議

目前的測試使用 mock 過的 Chrome API，雖然能驗證個別函式的邏輯，但無法捕捉到第 1 點（訊息傳遞斷裂）這類整合問題。建議：

- 為 `chrome.runtime.onMessage` 監聽器補上單元測試（修復第 1 點後）。
- 考慮加入整合測試或端對端測試，用 Puppeteer 或 Chrome Extension Testing Library 驗證 popup 與 service worker 之間的通訊是否正常。

---

## 修復優先順序建議

1. **第 1 點**（加入 onMessage 監聽器）— 修復後 popup 才能運作
2. **第 2 點**（manifest default_popup）— 確認設計方向後調整
3. **第 3、4 點**（錯誤處理與 null 檢查）— 提升穩定性
4. **第 5、6、7 點** — 改善開發體驗與使用者體驗
