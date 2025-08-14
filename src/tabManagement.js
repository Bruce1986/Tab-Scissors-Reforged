/**
 * Split tabs so that tabs to the right of the active tab move into a new window.
 * @returns {Promise<void>}
 */
export async function splitTabs() {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!activeTab) return;

    const allTabsInWindow = await chrome.tabs.query({ currentWindow: true });
    allTabsInWindow.sort((a, b) => a.index - b.index);

    const activeIndex = allTabsInWindow.findIndex((t) => t.id === activeTab.id);
    const tabsToMove = allTabsInWindow.slice(activeIndex + 1);

    if (tabsToMove.length === 0) return;

    const tabIdsToMove = tabsToMove.map((t) => t.id);

    const newWindow = await chrome.windows.create({ state: 'normal' });

    // All operations after window creation are wrapped in a try/catch
    // to ensure the new window is cleaned up on any failure.
    try {
      // Get the initial tab that comes with the new window.
      const [initialTab] = await chrome.tabs.query({ windowId: newWindow.id });

      // If the new window is unexpectedly empty, throw to trigger cleanup.
      if (!initialTab) {
        throw new Error(
          `Newly created window ${newWindow.id} has no initial tab.`
        );
      }

      // Move the desired tabs to the new window.
      await chrome.tabs.move(tabIdsToMove, {
        windowId: newWindow.id,
        index: -1,
      });

      // If removing the initial tab fails, we don't want to close the new window,
      // so it has its own separate try/catch.
      try {
        await chrome.tabs.remove(initialTab.id);
      } catch (error) {
        console.error(`Failed to remove initial tab ${initialTab.id}:`, error);
      }
    } catch (error) {
      console.error('Failed to prepare the new window or move tabs:', error);
      // Clean up the new window if any step in the process fails.
      try {
        await chrome.windows.remove(newWindow.id);
      } catch (cleanupError) {
        console.error(
          `Failed to clean up window ${newWindow.id} after an error:`,
          cleanupError
        );
      }
    }
  } catch (error) {
    console.error('An unexpected error occurred in splitTabs:', error);
  }
}

/**
 * Merge all open Chrome windows into one.
 * @returns {Promise<void>}
 */
export async function mergeAllWindows() {
  try {
    // Get the current window and all other windows.
    const currentWindow = await chrome.windows.getCurrent();
    const windows = await chrome.windows.getAll({ populate: true });

    // Filter for other windows that have tabs to merge.
    const windowsToMerge = windows.filter(
      (win) => win.id !== currentWindow.id && win.tabs && win.tabs.length > 0
    );

    if (windowsToMerge.length === 0) return;

    // Iterate over the windows that need to be merged.
    for (const win of windowsToMerge) {
      try {
        // Collect the IDs of all tabs in the other window.
        const tabIds = win.tabs.map((t) => t.id);

        // Move the tabs to the current window.
        await chrome.tabs.move(tabIds, {
          windowId: currentWindow.id,
          index: -1,
        });

        // Remove the original window, now that tabs are moved.
        await chrome.windows.remove(win.id);
      } catch (error) {
        // Log an error and continue to the next window.
        console.error(`Failed to merge window ${win.id}:`, error);
      }
    }
  } catch (error) {
    console.error('An unexpected error occurred in mergeAllWindows:', error);
  }
}
