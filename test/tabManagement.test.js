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
    const activeTab = { id: 1 };
    const tabs = [activeTab, { id: 2 }, { id: 3 }];
    const windowId = 999;

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(tabs);
    chrome.windows.create.mockResolvedValue({ id: 100 });

    await splitTabs(windowId);

    expect(chrome.windows.create).toHaveBeenCalledWith({ tabId: 2 });
    expect(chrome.tabs.move).toHaveBeenCalledWith([3], { windowId: 100, index: -1 });
  });

  test('does nothing when the active tab is last', async () => {
    const activeTab = { id: 3 };
    const tabs = [{ id: 1 }, { id: 2 }, activeTab];

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(tabs);

    await splitTabs(999);

    expect(chrome.windows.create).not.toHaveBeenCalled();
    expect(chrome.tabs.move).not.toHaveBeenCalled();
  });

  test('does nothing when the active tab is missing from the tab list', async () => {
    const activeTab = { id: 99 };
    const tabs = [{ id: 1 }, { id: 2 }, { id: 3 }];

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(tabs);

    await splitTabs(999);

    expect(chrome.windows.create).not.toHaveBeenCalled();
    expect(chrome.tabs.move).not.toHaveBeenCalled();
  });
});

describe('mergeAllWindows', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('moves tabs from other windows into the target window', async () => {
    const targetWindowId = 1;
    chrome.windows.getAll.mockResolvedValue([
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [{ id: 20 }, { id: 21 }] }
    ]);

    await mergeAllWindows(targetWindowId);

    expect(chrome.tabs.move).toHaveBeenCalledWith([20, 21], { windowId: targetWindowId, index: -1 });
  });

  test('skips windows that have no tabs', async () => {
    const targetWindowId = 1;
    chrome.windows.getAll.mockResolvedValue([
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [] },
      { id: 3 }
    ]);

    await mergeAllWindows(targetWindowId);

    expect(chrome.tabs.move).not.toHaveBeenCalled();
  });
});
