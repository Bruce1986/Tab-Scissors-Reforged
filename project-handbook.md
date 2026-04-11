# 🛠 開發協作手冊

## 📋 目錄
1. [任務分工與進度追蹤](#任務分工與進度追蹤)
2. [Git 開發流程與規範](#git-開發流程與規範)
3. [程式碼撰寫與 Review 注意事項](#程式碼撰寫與-review-注意事項)
4. [每日工作日誌區塊](#每日工作日誌區塊)
5. [資源與文件連結](#資源與文件連結)

---

## 🧱 任務分工與進度追蹤

| 任務編號 | 功能說明             | 負責人 | 狀態         | 備註 |
|----------|----------------------|--------|--------------|------|
| #001     | 登入畫面切版         | A      | ✅ 完成       |      |
| #002     | Google 登入串接      | B      | 🟡 進行中     | 依賴 #001 |
| #003     | API Token 機制       | B      | ⏳ 待開始     |      |

- 狀態建議使用：⏳ 待開始｜🟡 進行中｜🔍 審核中｜✅ 完成

---

## 🌱 Git 開發流程與規範

1. 每項任務請建立 feature branch，例如：
   ```bash
   git checkout -b feature/login-ui
   ```

2. 完成後發起 Pull Request（PR），標題格式：

   ```
   [Feature] 登入頁面切版 (#001)
   ```
3. 不能直接 push 到 `main` 分支，需透過 PR。
4. PR 提交後需指派另一位協作者進行 Review。
5. 合併前務必確認：

   * ✅ 沒有衝突
   * ✅ 已自我測試過
   * ✅ 遵守命名與格式規範

---

## 🧠 程式碼撰寫與 Review 注意事項

### 🧹 命名原則

* 變數需有語意：`userInfo` 不要寫成 `x`
* 函式命名盡量是動詞開頭，如 `getUserInfo`

### 🛡 程式邏輯

* 防呆與錯誤處理要寫清楚（例如登入錯誤的提示）
* 不要留死 code
* API 錯誤時要 console log 錯誤資訊

### 👀 Review 時要看的事

* [ ] 功能是否如預期運作？
* [ ] 是否有不合理命名？
* [ ] 是否有簡化空間或可讀性問題？
* [ ] 有無潛在 Bug（如未處理 null）？
* [ ] 結尾是否有自我測試結果備註？

---

## 🗓 每次工作日誌區塊

> 請每次 commit 前更新一次，記錄格式如下：

```markdown
### 🙋‍♂️ A 的日誌（2025/07/08）
- ✅ 完成：登入畫面切版（#001）
- 🟡 進行中：樣式微調、RWD 修正
- 🤔 問題：尚未確定登入按鈕顏色是否符合設計稿

### 🧑‍💻 B 的日誌（2025/07/08）
- ✅ 完成：API token 的初步設計草圖
- ⏳ 明日計畫：串接登入按鈕與 token API
- 🙋 想問：Login API 回傳錯誤格式是否統一？
```

### 🤖 AI Assistant 日誌（2025/07/08）
- ✅ 完成：修正 `mergeAllWindows` 關閉視窗邏輯並補齊單元測試
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2025/07/09）
- ✅ 加入移除視窗的錯誤處理並更新單元測試
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2025/07/10）
- ✅ 強化 handleMessage 檢查 null 並補齊測試
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2025/07/11）
- ✅ 新增 CI 流程自動執行測試
- ✅ 加入 null 訊息測試並修正 handleMessage
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/04）
- ✅ 修復 popup 與 service worker 訊息串接、補上 popup 防呆與錯誤處理
- ✅ 新增 extension icons 與 manifest 驗證測試
- ✅ 依 CodeRabbit 建議補上 `sendMessage` await、防 malformed message、防止 split 搬走 active tab
- ✅ 補齊 malformed message 與 split 邊界情境測試
- ✅ 依 CodeRabbit 建議補上 `windowId` 驗證，避免 message 導致跨視窗誤查詢
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 依 Gemini review 調整 `mergeAllWindows`，改為每個視窗獨立處理 tab move 錯誤
- ✅ 補上單元測試，確認單一視窗移動失敗時仍會繼續合併其他視窗
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 依 Gemini review 修正 MV3 `onMessage` 非同步回應流程，補上 `return true` 與 success response
- ✅ 確認 `popup.html` 與 PNG icons 已存在且受 Git 追蹤，manifest 資產引用無缺漏
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 依 Gemini review 補上錯誤傳遞鏈：`tabManagement` rethrow、service worker 回傳 error response、popup 依 response 判定失敗
- ✅ 補齊成功與失敗路徑測試，驗證 `handleMessage` 與 tab management 的錯誤處理行為
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 將 manifest icon 改為共用 `icon.svg`，避免引用未納入 base branch 的 PNG 資產
- ✅ 補上 popup 對 `undefined` response 的防呆，避免背景腳本未回應時出現誤判
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 依 Gemini review 將 popup 的 split/merge 點擊流程抽成共用 helper，降低重複邏輯
- ✅ 修正 `handleMessage` 的 `sendResponse` 參數命名，讓已使用參數與命名慣例一致
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 依 Gemini review 補上 popup 內可見的錯誤狀態訊息，避免失敗時只有 console log
- ✅ 補齊 popup 狀態訊息測試，驗證錯誤顯示與重試清空行為
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 依 Gemini review 強化錯誤傳播：無效 `windowId` 會回傳明確 error response，找不到 active tab 時會丟錯
- ✅ 補上 popup 執行中鎖定按鈕，避免連點造成重入與 Chrome API race condition
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 依 Gemini review 補上 incognito 視窗相容性，split/merge 會保留並比對隱私模式狀態
- ✅ 補齊 tab management 測試，驗證建立新視窗與跨視窗合併時的 incognito 邊界條件
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 依 Gemini review 補上 target window 驗證，避免 merge 時目標視窗不存在卻被誤判成功
- ✅ 將 action pending 保護移到 service worker，讓 popup 關閉重開後仍能阻擋重複操作
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 依 Gemini review 將 service worker lock 收斂為每視窗一把鎖，避免 split/merge 在同一視窗交錯競爭
- ✅ 補上測試，驗證同一視窗的不同 action 也會被統一阻擋直到前一個操作完成
- ✅ 自我測試：`npm test` 全數通過

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 更新 `README.md`，對齊 popup、service worker、incognito 與測試現況
- ✅ 新增 `WORKLOG.md` 並補齊文件維護紀錄，方便後續追蹤文件更新
- 🧪 文件更新：未涉及程式邏輯變更，未額外執行測試

### 🤖 AI Assistant 日誌（2026/04/12）
- ✅ 更新 `AGENTS.md`、`GEMINI.md`、`CODE_REVIEW.md`，移除過時重複內容並補上目前狀態摘要
- ✅ 將 AI 協作入口文件收斂為連結導向，避免再維護多份舊版 handbook 副本
- 🧪 文件更新：未涉及程式邏輯變更，未額外執行測試

---

## 📚 資源與文件連結

* 🔗 Figma 設計稿：[點我前往](https://figma.com/xxxx)
* 🔗 API 文件連結：[Swagger Docs](https://your-api-docs.com)
* 🔗 技術指南 / Code Style：[點我查看](https://github.com/你的組織/code-style-guide)
* 🔗 工作日誌：[WORKLOG.md](WORKLOG.md)

---

## 📘 文件維護流程

1. 功能或流程有變動時，同步更新 `README.md`、`project-handbook.md` 與相關文件。
2. 若本次工作有明確里程碑，請在 `WORKLOG.md` 補上日期、摘要與驗證結果。
3. 若是 PR review 修正循環，請在文件中記錄最終收斂結果與重要決策，避免後續重複追查。

---

## 📌 補充：兩人協作小叮嚀

* **如果卡住，請互相支援或寫日誌記錄問題點，等老闆回來再補救**
* **分工明確，避免同時改動同一檔案造成衝突**
* **即使只是小改動，也請走 PR 流程，養成良好習慣**

---

## 🏁 TODO 清單樣板（可複製貼上）

```markdown
- [ ] 任務說明：
- [ ] 建立分支：
- [ ] 自我測試情境：
- [ ] 需他人 Review 項目：
- [ ] 文件是否補上：
```

---

## 🧰 建議檔名：`project-handbook.md` 或 `開發協作手冊.md`

---

這樣設計的優點是：

* **透明可見**：不在時，也能清楚該怎麼協作與更新。
* **低門檻維護**：全用文字就能同步，不需額外學工具。
* **便於版本控管**：放在專案根目錄，搭配 Git 使用。
