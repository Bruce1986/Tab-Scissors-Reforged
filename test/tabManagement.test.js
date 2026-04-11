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
    getAll: jest.fn()
  }
};

describe('splitTabs', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('moves tabs to the right into new window', async () => {
    const activeTab = { id: 1, incognito: false };
    const tabs = [activeTab, { id: 2 }, { id: 3 }];
    const windowId = 999;

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(tabs);
    chrome.windows.create.mockResolvedValue({ id: 100 });

    await splitTabs(windowId);

    expect(chrome.windows.create).toHaveBeenCalledWith({ tabId: 2, incognito: false });
    expect(chrome.tabs.move).toHaveBeenCalledWith([3], { windowId: 100, index: -1 });
  });

  test('does nothing when the active tab is last', async () => {
    const activeTab = { id: 3, incognito: false };
    const tabs = [{ id: 1 }, { id: 2 }, activeTab];

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(tabs);

    await splitTabs(999);

    expect(chrome.windows.create).not.toHaveBeenCalled();
    expect(chrome.tabs.move).not.toHaveBeenCalled();
  });

  test('throws when the active tab is missing from the tab list', async () => {
    const activeTab = { id: 99, incognito: false };
    const tabs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      chrome.tabs.query.mockResolvedValueOnce([activeTab]);
      chrome.tabs.query.mockResolvedValueOnce(tabs);

      await expect(splitTabs(999)).rejects.toThrow('Active tab not found in the current window.');

      expect(chrome.windows.create).not.toHaveBeenCalled();
      expect(chrome.tabs.move).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('splitTabs failed:', expect.any(Error));
    } finally {
      consoleSpy.mockRestore();
    }
  });

  test('rethrows errors after logging when split fails', async () => {
    const error = new Error('Query failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      chrome.tabs.query.mockRejectedValue(error);

      await expect(splitTabs(999)).rejects.toThrow('Query failed');
      expect(consoleSpy).toHaveBeenCalledWith('splitTabs failed:', error);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});

describe('mergeAllWindows', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('moves tabs from other windows into the target window', async () => {
    const targetWindowId = 1;
    chrome.windows.getAll.mockResolvedValue([
      { id: 1, incognito: false, tabs: [{ id: 10 }] },
      { id: 2, incognito: false, tabs: [{ id: 20 }, { id: 21 }] }
    ]);

    await mergeAllWindows(targetWindowId);

    expect(chrome.tabs.move).toHaveBeenCalledWith([20, 21], { windowId: targetWindowId, index: -1 });
  });

  test('skips windows that have no tabs', async () => {
    const targetWindowId = 1;
    chrome.windows.getAll.mockResolvedValue([
      { id: 1, incognito: false, tabs: [{ id: 10 }] },
      { id: 2, incognito: false, tabs: [] },
      { id: 3, incognito: false }
    ]);

    await mergeAllWindows(targetWindowId);

    expect(chrome.tabs.move).not.toHaveBeenCalled();
  });

  test('continues merging other windows when one move fails', async () => {
    const targetWindowId = 1;
    const error = new Error('Move failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      chrome.windows.getAll.mockResolvedValue([
        { id: 1, incognito: false, tabs: [{ id: 10 }] },
        { id: 2, incognito: false, tabs: [{ id: 20 }] },
        { id: 3, incognito: false, tabs: [{ id: 30 }] }
      ]);
      chrome.tabs.move
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([]);

      await mergeAllWindows(targetWindowId);

      expect(chrome.tabs.move).toHaveBeenNthCalledWith(1, [20], { windowId: targetWindowId, index: -1 });
      expect(chrome.tabs.move).toHaveBeenNthCalledWith(2, [30], { windowId: targetWindowId, index: -1 });
      expect(consoleSpy).toHaveBeenCalledWith('Failed to move tabs from window 2:', error);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  test('rethrows outer errors after logging when merge setup fails', async () => {
    const error = new Error('Get all failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      chrome.windows.getAll.mockRejectedValue(error);

      await expect(mergeAllWindows(1)).rejects.toThrow('Get all failed');
      expect(consoleSpy).toHaveBeenCalledWith('mergeAllWindows failed:', error);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  test('skips windows whose incognito state does not match the target window', async () => {
    const targetWindowId = 1;
    chrome.windows.getAll.mockResolvedValue([
      { id: 1, incognito: true, tabs: [{ id: 10 }] },
      { id: 2, incognito: false, tabs: [{ id: 20 }, { id: 21 }] },
      { id: 3, incognito: true, tabs: [{ id: 30 }] }
    ]);

    await mergeAllWindows(targetWindowId);

    expect(chrome.tabs.move).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.move).toHaveBeenCalledWith([30], { windowId: targetWindowId, index: -1 });
  });
});
