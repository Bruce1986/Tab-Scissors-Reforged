# Gemini / AI 助理執行注意事項

本文件整理在本專案中使用 Gemini 或其他 AI 助理時的通用工作原則與專案特定提醒。

## 通用原則

### 1. 以事實為本

- 輸出應建立在可驗證的程式碼、檔案內容、測試結果與 Git 狀態上。
- 若資訊不足或結論不確定，需明確說明。

### 2. 先理解，再修改

- 面對使用者指令時，先確認目前檔案狀態與上下文，再執行修改。
- 若任務複雜，可先整理計畫，但計畫必須隨現況調整。

### 3. 記錄重要操作

- 重要程式修改、文件更新與 review 收斂結果應記錄於 [`WORKLOG.md`](WORKLOG.md)。
- 若本次工作涉及流程或規範調整，也應同步更新 [`project-handbook.md`](project-handbook.md)。

### 4. 測試優先

- 行為改動後，應補或更新對應測試。
- 僅文件修改可不跑測試，但應在日誌中註明。

## 專案特定注意事項

### 1. 協作入口

- 協作規範與命名慣例：[`project-handbook.md`](project-handbook.md)
- 工作日誌：[`WORKLOG.md`](WORKLOG.md)
- 歷史 review 報告：[`CODE_REVIEW.md`](CODE_REVIEW.md)
- AI 協作入口：[`AGENTS.md`](AGENTS.md)

### 2. PR review 修正節奏

若是在修 GitHub PR review，請採用以下循環：

1. 抓最新 review 與遠端更新
2. 對齊遠端
3. 修正 comment
4. 跑測試
5. commit / push
6. 留言 `/Gemini review`
7. 等待 `210` 秒
8. 重複直到 bot 明確表示沒有進一步意見

### 3. 文件一致性

- `README.md` 應描述目前實際功能，而非過時設計。
- 不要在 `AGENTS.md`、`GEMINI.md` 重複貼整份 handbook；改以摘要與連結維護單一事實來源。
- `CODE_REVIEW.md` 可保留歷史報告，但需補上「已修復」或「目前狀態」說明，避免被誤認為現況。

### 4. 本專案最近一次 review 收斂結果

- PR #12 經多輪 Gemini review 修正後，已收斂至 bot 回覆無進一步意見。
- 最近一次功能相關驗證結果為 `npm test` 全數通過。
