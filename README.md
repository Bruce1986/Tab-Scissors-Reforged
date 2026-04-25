# ✂️ Tab Scissors Reforged

A modern, lightweight Chrome extension to split and merge your tabs with elegance. It rebuilds the classic "Tab Scissors" using Manifest V3 and is actively maintained.

---

## 📦 Features

### ✅ Core Features

- **Split Tabs at Current Position**
  - When triggered, the **active tab and all tabs to its left** stay in the current window.
  - All tabs **to the right of the current tab** move into a new browser window.
  - Preserves incognito state when splitting from a private window.

- **Merge All Windows**
  - Merges all open Chrome windows that match the target window's incognito state.
  - Tabs are appended into the chosen target window.
  - Continues processing other windows even if one tab-move operation fails.
  - No deduplication (duplicate tabs will remain intact).

- **Popup Actions with Feedback**
  - Trigger split or merge directly from the extension popup.
  - Shows inline error status when an action fails.
  - Blocks duplicate actions against the same window while one is already in progress.

- **Manifest V3 Message Routing**
  - Popup actions are routed through the service worker with explicit success and error responses.
  - Invalid payloads and missing `windowId` values return clear error messages.

---

## 🧪 Installation (Dev Mode)

1. Clone this repo.
2. Go to `chrome://extensions/` in your browser.
3. Enable **Developer Mode**.
4. Click **"Load unpacked"** and select the project folder.
5. The extension icon should appear in your toolbar.

---

## 🚀 Usage

- Click the extension icon → Choose:
  - 🔪 **Split Here**
  - 🪢 **Merge Windows**

> Optionally, you can bind custom shortcuts in Chrome's Extensions → Keyboard Shortcuts.

---

## 🧪 Testing

```bash
npm test
```

Coverage currently includes:

- popup action wiring and inline status feedback
- service worker message validation and per-window action locking
- split / merge edge cases, including incognito handling
- manifest popup and icon configuration

---

## 🛠️ Tech Stack

- **Manifest V3**
- JavaScript (Vanilla or ES6 Modules)
- Chrome Tabs API
- Chrome Windows API

---

## 🔐 Permissions Required

```json
"permissions": ["tabs", "windows"]
```

These are needed to manipulate tab positions and window structures.

---

## 📋 Roadmap / TODO

* [ ] E1: Custom split point (select index or tab)
* [ ] E2: Multi-window slicing (evenly split tabs into N windows)
* [ ] E3: Group-based splitting (by Chrome Tab Groups)
* [ ] E4: Selective window merge
* [ ] E5: Retain original window size/position
* [ ] E6: Window naming based on action
* [ ] E7: Keyboard shortcut management UI / settings

---

## 🧠 Motivation

The original Tab Scissors is no longer maintained and incompatible with modern versions of Chrome.
This extension re-implements its core logic with a modern, maintainable foundation and optional new features.

---

## 👩‍💻 Contribution Guide

1. Fork the repository
2. Run `npm install`
3. Make changes in `/src` and update tests in `/test` when behavior changes
4. Run `npm test`
5. Update `project-handbook.md` and `WORKLOG.md` for notable work
6. Submit a PR with clear commit messages

---

## 📄 License

MIT License © 2025-present [Bruce Jhang]
