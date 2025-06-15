import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { splitTabs, mergeAllWindows } from '../src/tabManagement.js';

global.chrome = {
  tabs: {
    query: jest.fn(),
    move: jest.fn()
  },
  windows: {
    create: jest.fn(),
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

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(tabs);
    chrome.windows.create.mockResolvedValue({ id: 100 });

    await splitTabs();

    expect(chrome.windows.create).toHaveBeenCalledWith({ tabId: 2 });
    expect(chrome.tabs.move).toHaveBeenCalledWith([3], { windowId: 100, index: -1 });
  });
});

describe('mergeAllWindows', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('moves tabs from other windows and closes them', async () => {
    chrome.windows.getAll.mockResolvedValue([
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [{ id: 20 }, { id: 21 }] }
    ]);

    await mergeAllWindows();

    expect(chrome.tabs.move).toHaveBeenCalledWith([20, 21], { windowId: 1, index: -1 });
    expect(chrome.windows.remove).toHaveBeenCalledWith(2);
  });
});
