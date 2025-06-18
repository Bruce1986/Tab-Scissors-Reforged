/**
 * Split tabs so that tabs to the right of the active tab move into a new window.
 * @returns {Promise<void>}
 */
export async function splitTabs() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;

  const allTabsInWindow = await chrome.tabs.query({ currentWindow: true });
  // 按索引排序，確保順序正確
  allTabsInWindow.sort((a, b) => a.index - b.index);
  
  const activeIndex = allTabsInWindow.findIndex(t => t.id === activeTab.id);
  const tabsToMove = allTabsInWindow.slice(activeIndex + 1);

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
 * @returns {Promise<void>}
 */
export async function mergeAllWindows() {
  // 取得除了當前視窗以外的所有視窗
  const currentWindow = await chrome.windows.getCurrent();
  const windows = await chrome.windows.getAll({ populate: true });

  if (windows.length < 2) return;

  // 遍歷所有視窗
  for (const win of windows) {
    // 如果是當前視窗，就跳過
    if (win.id === currentWindow.id) continue;
    // 如果視窗沒有分頁，也跳過
    if (!win.tabs || win.tabs.length === 0) continue;

    // 將其他視窗的所有分頁ID收集起來
    const tabIds = win.tabs.map(t => t.id);
    // 將這些分頁移至當前視窗的最後
    await chrome.tabs.move(tabIds, { windowId: currentWindow.id, index: -1 });
  }

}
