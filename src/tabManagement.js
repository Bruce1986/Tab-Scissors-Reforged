/**
 * Split tabs so that tabs to the right of the active tab move into a new window.
 * @param {number} windowId - The ID of the window to split.
 * @returns {Promise<void>}
 */
export async function splitTabs(windowId) {
  const [activeTab] = await chrome.tabs.query({ active: true, windowId });
  if (!activeTab) return;

  const allTabsInWindow = await chrome.tabs.query({ windowId });
  // Sort tabs by index to ensure correct order
  allTabsInWindow.sort((a, b) => a.index - b.index);

  const activeIndex = allTabsInWindow.findIndex(t => t.id === activeTab.id);
  const tabsToMove = allTabsInWindow.slice(activeIndex);

  if (tabsToMove.length === 0) return;

  const tabIdsToMove = tabsToMove.map(t => t.id);

  // 建立一個新視窗，並直接將所有目標分頁移入
  const newWindow = await chrome.windows.create({ tabId: tabIdsToMove[0] });
  if (tabIdsToMove.length > 1) {
    await chrome.tabs.move(tabIdsToMove.slice(1), { windowId: newWindow.id, index: -1 });
  }
}

/**
 * Merge all open Chrome windows into one.
 * @param {number} targetWindowId - The ID of the window to merge into.
 * @returns {Promise<void>}
 */
export async function mergeAllWindows(targetWindowId) {
  // 取得所有視窗
  const windows = await chrome.windows.getAll({ populate: true });

  if (windows.length < 2) return;

  // 遍歷所有視窗
  for (const win of windows) {
    // 如果是目標視窗，就跳過
    if (win.id === targetWindowId) continue;
    // 如果視窗沒有分頁，也跳過
    if (!win.tabs || win.tabs.length === 0) continue;

    // 將其他視窗的所有分頁ID收集起來
    const tabIds = win.tabs.map(t => t.id);
    // 將這些分頁移至目標視窗的最後
    await chrome.tabs.move(tabIds, { windowId: targetWindowId, index: -1 });
  }

}
