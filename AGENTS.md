# AI 助理協作指南

本專案使用 AI 助理（Claude Code、GitHub Copilot、Codex、Gemini Code Assist 等）協助開發、文件維護與 PR review 修正。

## 核心原則

- 優先遵從可落地的 review 建議；若建議不適用，需在回覆、PR 或工作日誌中說明理由。
- 功能邏輯有變更時，應同步更新對應測試；若無法補測試，需明確記錄原因。
- 文件與流程必須和目前實作一致，不要保留過時描述。
- 所有重要操作都應留下可追蹤紀錄。

## 專案文件入口

- 協作流程與命名規範：[`project-handbook.md`](project-handbook.md)
- 工作日誌：[`WORKLOG.md`](WORKLOG.md)
- 歷史審查結論：[`CODE_REVIEW.md`](CODE_REVIEW.md)
- Gemini 額外執行注意事項：[`GEMINI.md`](GEMINI.md)

## PR Review 修正流程

如果是在修 GitHub PR comment，請依 `GEMINI.md` 的「PR review 修正節奏」執行完整循環：
[`GEMINI.md`](GEMINI.md#pr-review-修正節奏)

## 文件維護要求

- commit 前若本次工作有重要里程碑，請更新 `project-handbook.md` 的 AI Assistant 日誌區塊。
- 當功能、流程或 review 結論有明顯變動時，請同步更新 `README.md` 與 `WORKLOG.md`。
- 避免在多份文件中複製同一段長內容；優先維護單一來源，再用連結導向。
