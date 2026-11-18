/**
 * Split tabs so that tabs to the right of the active tab move into a new window.
 * @returns {Promise<void>}
 */
export async function splitTabs() {
  try {
    const allTabsInWindow = await chrome.tabs.query({ currentWindow: true });
    const activeTab = allTabsInWindow.find((t) => t.active);
    if (!activeTab) return;

    const activeIndex = allTabsInWindow.findIndex((t) => t.id === activeTab.id);
    const tabsToMove = allTabsInWindow.slice(activeIndex + 1);

    if (tabsToMove.length === 0) return;

    const tabIdsToMove = tabsToMove.map((t) => t.id);

    const newWindow = await chrome.windows.create({ state: 'normal' });
    let initialTab;

    // All operations after window creation are wrapped in a try/catch
    // to ensure the new window is cleaned up on any failure.
    try {
      // Get the initial tab that comes with the new window.
      [initialTab] = await chrome.tabs.query({ windowId: newWindow.id });

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
      await cleanUpNewWindow(newWindow.id, tabIdsToMove);
    }
  } catch (error) {
    console.error('An unexpected error occurred in splitTabs:', error);
  }
}

/**
 * Close a window created by splitTabs after a failure, unless some of the
 * user's tabs already made it into the window. A multi-id chrome.tabs.move()
 * can reject after moving only part of the list, and closing the window then
 * would close those tabs too.
 * @param {number} windowId The window created by splitTabs.
 * @param {number[]} movedTabIds The tab ids splitTabs tried to move.
 * @returns {Promise<void>}
 */
async function cleanUpNewWindow(windowId, movedTabIds) {
  try {
    const remaining = await chrome.tabs.query({ windowId });
    if (remaining.some((t) => movedTabIds.includes(t.id))) {
      console.error(
        `Kept window ${windowId} because some tabs were already moved into it.`
      );
      return;
    }
    await chrome.windows.remove(windowId);
  } catch (cleanupError) {
    console.error(
      `Failed to clean up window ${windowId} after an error:`,
      cleanupError
    );
  }
}

/**
 * Merge all open Chrome windows into one.
 * @returns {Promise<void>}
 */
export async function mergeAllWindows() {
  try {
    // Get all windows and find the currently focused one.
    const windows = await chrome.windows.getAll({
      populate: true,
      windowTypes: ['normal'],
    });
    const currentWindow = windows.find((w) => w.focused);

    // If no window is focused, we cannot merge.
    if (!currentWindow) {
      console.error('Could not find a focused window to merge tabs into.');
      return;
    }

    // Filter for other windows that have tabs to merge.
    const windowsToMerge = windows.filter(
      (win) => win.id !== currentWindow.id && win.tabs && win.tabs.length > 0
    );

    if (windowsToMerge.length === 0) return;

    // Process all merge operations sequentially to ensure deterministic tab order.
    //
    // Windows are merged one at a time on purpose rather than with a single
    // chrome.tabs.move() over every tab id. A multi-id move is not
    // transactional: if it rejects part-way, some tabs have already moved and
    // there is no rollback, so a single call would not give all-or-nothing
    // behaviour either. It would, however, let one bad window (e.g. a tab that
    // closed between getAll() and move()) abort the whole merge. Handling each
    // window separately keeps such a failure isolated: the remaining windows
    // are still merged, and a window whose move was rejected is never closed,
    // so any tabs still in it stay open (see the
    // "should continue merging other windows if one fails" test).
    for (const win of windowsToMerge) {
      try {
        const tabIds = win.tabs.map((t) => t.id);
        await chrome.tabs.move(tabIds, {
          windowId: currentWindow.id,
          index: -1,
        });
      } catch (error) {
        console.error(`Failed to merge window ${win.id}:`, error);
        continue;
      }

      // Chrome normally closes a window by itself once its last tab has been
      // moved out, so the window may already be gone here. Only close it if it
      // is empty; tabs opened in it after getAll() must not be closed.
      try {
        const remaining = await chrome.tabs.query({ windowId: win.id });
        if (remaining.length > 0) {
          console.error(
            `Window ${win.id} still has ${remaining.length} tab(s) after merging; leaving it open.`
          );
          continue;
        }
        await chrome.windows.remove(win.id);
      } catch {
        // The window was already closed by Chrome; nothing left to do.
      }
    }
  } catch (error) {
    console.error('An unexpected error occurred in mergeAllWindows:', error);
  }
}
