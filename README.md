# ✂️ Tab Scissors Reforged

A modern, lightweight Chrome extension to split and merge your tabs with elegance.
It rebuilds the classic "Tab Scissors" using Manifest V3 and is actively maintained.

---

## 📦 Features

### ✅ Core Features

- **Split Tabs at Current Position**
  - When triggered, all tabs **to the left and including the current tab** stay in the current window.
  - All tabs **to the right of the current tab** move into a new browser window.

- **Merge All Windows**
  - Merges all open Chrome windows into a single window.
  - Tabs are appended in order of window creation.
  - No deduplication (duplicate tabs will remain intact).

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
* [ ] E7: Keyboard shortcut support with settings

---

## 🧠 Motivation

The original Tab Scissors is no longer maintained and incompatible with modern versions of Chrome.
This extension re-implements its core logic with a modern, maintainable foundation and optional new features.

---

## 👩‍💻 Contribution Guide

1. Fork the repository
2. Run `npm install` (if build tooling is introduced)
3. Make changes in `/src` and test locally
4. Submit a PR with clear commit messages

---

## 📄 License

MIT License © 2025-present [Bruce Jhang]

