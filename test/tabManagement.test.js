import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { splitTabs, mergeAllWindows } from '../src/tabManagement.js';

// Helper function to create a mock of the Chrome API for test isolation
const createChromeApiMock = () => {
  global.chrome = {
    tabs: {
      query: jest.fn(),
      move: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    },
    windows: {
      create: jest.fn(),
      getCurrent: jest.fn(),
      getAll: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    },
  };
};

describe('splitTabs', () => {
  beforeEach(() => {
    createChromeApiMock();
  });

  test('should move tabs to the right of the active tab to a new window', async () => {
    // Arrange
    const activeTab = { id: 1, index: 0 };
    const tabsToMove = [{ id: 2, index: 1 }, { id: 3, index: 2 }];
    const allTabs = [activeTab, ...tabsToMove];
    const newWindow = { id: 100, tabs: [{ id: 99 }] };

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(allTabs);
    chrome.windows.create.mockResolvedValue(newWindow);

    // Act
    await splitTabs();

    // Assert
    expect(chrome.windows.create).toHaveBeenCalledWith({ state: 'normal' });
    expect(chrome.tabs.move).toHaveBeenCalledWith([2, 3], { windowId: 100, index: -1 });
    expect(chrome.tabs.remove).toHaveBeenCalledWith(99);
  });

  test('should do nothing if there are no tabs to the right', async () => {
    // Arrange
    const activeTab = { id: 3, index: 2 };
    const allTabs = [{ id: 1, index: 0 }, { id: 2, index: 1 }, activeTab];

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(allTabs);

    // Act
    await splitTabs();

    // Assert
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });

  test('should not fail if no active tab is found', async () => {
    // Arrange
    chrome.tabs.query.mockResolvedValueOnce([]);

    // Act
    await splitTabs();

    // Assert
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });

  test('should clean up and log error if the new window is unexpectedly empty', async () => {
    // Arrange
    const activeTab = { id: 1, index: 0 };
    const allTabs = [activeTab, { id: 2, index: 1 }];
    const newWindow = { id: 100, tabs: [] };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(allTabs);
    chrome.windows.create.mockResolvedValue(newWindow);

    // Act
    await splitTabs();

    // Assert
    expect(console.error).toHaveBeenCalledWith(`Newly created window ${newWindow.id} has no initial tab.`);
    expect(chrome.windows.remove).toHaveBeenCalledWith(newWindow.id);
    expect(chrome.tabs.move).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should clean up if moving tabs fails', async () => {
    // Arrange
    const activeTab = { id: 1, index: 0 };
    const allTabs = [activeTab, { id: 2, index: 1 }];
    const newWindow = { id: 100, tabs: [{ id: 99 }] };
    const moveError = new Error('Failed to move');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(allTabs);
    chrome.windows.create.mockResolvedValue(newWindow);
    chrome.tabs.move.mockRejectedValue(moveError);

    // Act
    await splitTabs();

    // Assert
    expect(console.error).toHaveBeenCalledWith('Failed to move tabs:', moveError);
    expect(chrome.windows.remove).toHaveBeenCalledWith(newWindow.id);
    expect(chrome.tabs.remove).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should log error if removing the initial tab fails', async () => {
    // Arrange
    const activeTab = { id: 1, index: 0 };
    const allTabs = [activeTab, { id: 2, index: 1 }];
    const initialTab = { id: 99 };
    const newWindow = { id: 100, tabs: [initialTab] };
    const removeError = new Error('Failed to remove');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(allTabs);
    chrome.windows.create.mockResolvedValue(newWindow);
    chrome.tabs.remove.mockRejectedValue(removeError);

    // Act & Assert
    await expect(splitTabs()).resolves.not.toThrow();

    // Verify logs
    expect(console.error).toHaveBeenCalledWith(`Failed to remove initial tab ${initialTab.id}:`, removeError);
    consoleSpy.mockRestore();
  });
});

describe('mergeAllWindows', () => {
  beforeEach(() => {
    createChromeApiMock();
    chrome.windows.getCurrent.mockResolvedValue({ id: 1 });
  });

  test('moves tabs from other windows and closes them', async () => {
    // Arrange
    const windows = [
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [{ id: 20 }, { id: 21 }] }
    ];
    chrome.windows.getAll.mockResolvedValue(windows);

    // Act
    await mergeAllWindows();

    // Assert
    expect(chrome.tabs.move).toHaveBeenCalledWith([20, 21], { windowId: 1, index: -1 });
    expect(chrome.windows.remove).toHaveBeenCalledWith(2);
  });

  test('logs error if window removal fails', async () => {
    // Arrange
    const windows = [
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [{ id: 20 }] }
    ];
    const removeError = new Error('Removal failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    chrome.windows.getAll.mockResolvedValue(windows);
    chrome.windows.remove.mockRejectedValue(removeError);

    // Act
    await mergeAllWindows();

    // Assert
    expect(console.error).toHaveBeenCalledWith('Failed to remove window 2:', removeError);
    consoleSpy.mockRestore();
  });
});
