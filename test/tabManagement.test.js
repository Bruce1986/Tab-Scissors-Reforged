import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { splitTabs, mergeAllWindows } from '../src/tabManagement.js';

global.chrome = {
  tabs: {
    query: jest.fn(),
    move: jest.fn()
  },
  windows: {
    create: jest.fn(),
    getCurrent: jest.fn(),
    getAll: jest.fn(),
    remove: jest.fn()
  }
};

describe('splitTabs', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('moves tabs to the right into new window', async () => {
    const activeTab = { id: 1 };
    const tabs = [activeTab, { id: 2 }, { id: 3 }];
    const windowId = 999;

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(tabs);
    chrome.windows.create.mockResolvedValue({ id: 100 });

    await splitTabs(windowId);

    // Expect the first tab to be moved to the new window (since we split FROM the current tab)
    expect(chrome.windows.create).toHaveBeenCalledWith({ tabId: 1 });
    // Expect the remaining tabs to be moved
    expect(chrome.tabs.move).toHaveBeenCalledWith([2, 3], { windowId: 100, index: -1 });
  });
});

describe('mergeAllWindows', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('moves tabs from other windows and closes them', async () => {
    const targetWindowId = 1;
    chrome.windows.getAll.mockResolvedValue([
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [{ id: 20 }, { id: 21 }] }
    ]);

    await mergeAllWindows(targetWindowId);

    expect(chrome.tabs.move).toHaveBeenCalledWith([20, 21], { windowId: targetWindowId, index: -1 });
    expect(chrome.windows.remove).toHaveBeenCalledWith(2);
  });

  test('logs error if window removal fails', async () => {
    const targetWindowId = 1;
    const error = new Error('Removal failed');
    chrome.windows.getAll.mockResolvedValue([
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [{ id: 20 }] }
    ]);
    chrome.windows.remove.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await mergeAllWindows(targetWindowId);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to remove window 2:', error);
    consoleSpy.mockRestore();
  });
});
