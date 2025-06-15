/**
 * Split tabs so that tabs to the right of the active tab move into a new window.
 * @returns {Promise<void>}
 */
export async function splitTabs() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;

  const tabs = await chrome.tabs.query({ currentWindow: true });
  const activeIndex = tabs.findIndex(t => t.id === activeTab.id);
  const toMove = tabs.slice(activeIndex + 1).map(t => t.id);

  if (toMove.length === 0) return;

  const newWindow = await chrome.windows.create({ tabId: toMove[0] });
  if (toMove.length > 1) {
    await chrome.tabs.move(toMove.slice(1), { windowId: newWindow.id, index: -1 });
  }
}

/**
 * Merge all open Chrome windows into one.
 * @returns {Promise<void>}
 */
export async function mergeAllWindows() {
  const windows = await chrome.windows.getAll({ populate: true });
  if (windows.length < 2) return;

  const target = windows[0];
  for (let i = 1; i < windows.length; i++) {
    const win = windows[i];
    const ids = win.tabs.map(t => t.id);
    if (ids.length) {
      await chrome.tabs.move(ids, { windowId: target.id, index: -1 });
    }
  }

  for (let i = 1; i < windows.length; i++) {
    await chrome.windows.remove(windows[i].id);
  }
}
