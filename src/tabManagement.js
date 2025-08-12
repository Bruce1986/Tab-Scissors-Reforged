/**
 * Split tabs so that tabs to the right of the active tab move into a new window.
 * @returns {Promise<void>}
 */
export async function splitTabs() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;

  const allTabsInWindow = await chrome.tabs.query({ currentWindow: true });
  // Sort tabs by index to ensure correct order
  allTabsInWindow.sort((a, b) => a.index - b.index);
  
  const activeIndex = allTabsInWindow.findIndex(t => t.id === activeTab.id);
  const tabsToMove = allTabsInWindow.slice(activeIndex + 1);

  if (tabsToMove.length === 0) return;

  const tabIdsToMove = tabsToMove.map(t => t.id);

  // Create a new window, then move the tabs over.
  const newWindow = await chrome.windows.create({ state: 'normal' });

  // Get the initial tab that comes with the new window.
  const initialTab = newWindow.tabs?.[0];

  // If the new window is unexpectedly empty, clean it up and exit.
  if (!initialTab) {
    await chrome.windows.remove(newWindow.id);
    return;
  }

  try {
    // Move the desired tabs to the new window.
    await chrome.tabs.move(tabIdsToMove, { windowId: newWindow.id, index: -1 });
  } catch (error) {
    console.error('Failed to move tabs:', error);
    // Clean up the new window if the move fails.
    await chrome.windows.remove(newWindow.id);
    return;
  }

  // Remove the initial blank tab.
  await chrome.tabs.remove(initialTab.id);
}

/**
 * Merge all open Chrome windows into one.
 * @returns {Promise<void>}
 */
export async function mergeAllWindows() {
  // Get the current window and all other windows.
  const currentWindow = await chrome.windows.getCurrent();
  const windows = await chrome.windows.getAll({ populate: true });

  if (windows.length < 2) return;

  // Iterate over all windows.
  for (const win of windows) {
    // Skip the current window.
    if (win.id === currentWindow.id) continue;
    // Skip windows without tabs.
    if (!win.tabs || win.tabs.length === 0) continue;

    // Collect the IDs of all tabs in the other window.
    const tabIds = win.tabs.map(t => t.id);
    // Move the tabs to the current window.
    await chrome.tabs.move(tabIds, { windowId: currentWindow.id, index: -1 });

    // Remove the original window, logging an error on failure.
    try {
      await chrome.windows.remove(win.id);
    } catch (error) {
      console.error(`Failed to remove window ${win.id}:`, error);
    }
  }

}
