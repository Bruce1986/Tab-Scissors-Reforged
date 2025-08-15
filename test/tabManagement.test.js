import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
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
    const allTabs = [
      { id: 1, active: true, index: 0 },
      { id: 2, active: false, index: 1 },
      { id: 3, active: false, index: 2 },
    ];
    const newWindow = { id: 100 };
    const initialTab = { id: 99 };

    chrome.tabs.query
      .mockResolvedValueOnce(allTabs) // For all tabs in window
      .mockResolvedValueOnce([initialTab]); // For the new window's initial tab
    chrome.windows.create.mockResolvedValue(newWindow);

    // Act
    await splitTabs();

    // Assert
    expect(chrome.tabs.query).toHaveBeenCalledWith({ currentWindow: true });
    expect(chrome.tabs.move).toHaveBeenCalledWith([2, 3], { windowId: 100, index: -1 });
    expect(chrome.tabs.remove).toHaveBeenCalledWith(initialTab.id);
  });

  test('should do nothing if there are no tabs to the right', async () => {
    // Arrange
    const allTabs = [
      { id: 1, active: false, index: 0 },
      { id: 2, active: true, index: 1 },
    ];
    chrome.tabs.query.mockResolvedValueOnce(allTabs);

    // Act
    await splitTabs();

    // Assert
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });

  describe('with error logging', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log top-level error if tab query fails', async () => {
      // Arrange
      const queryError = new Error('Failed to query tabs');
      chrome.tabs.query.mockRejectedValue(queryError);

      // Act
      await splitTabs();

      // Assert
      expect(console.error).toHaveBeenCalledWith('An unexpected error occurred in splitTabs:', queryError);
    });

    test('should clean up if moving tabs fails', async () => {
      // Arrange
      const allTabs = [
        { id: 1, active: true, index: 0 },
        { id: 2, active: false, index: 1 },
      ];
      const newWindow = { id: 100 };
      const initialTab = { id: 99 };
      const moveError = new Error('Move failed');

      chrome.tabs.query
        .mockResolvedValueOnce(allTabs)
        .mockResolvedValueOnce([initialTab]);
      chrome.windows.create.mockResolvedValue(newWindow);
      chrome.tabs.move.mockRejectedValue(moveError);

      // Act
      await splitTabs();

      // Assert
      expect(console.error).toHaveBeenCalledWith('Failed to prepare the new window or move tabs:', moveError);
      expect(chrome.windows.remove).toHaveBeenCalledWith(newWindow.id);
    });
  });
});

describe('mergeAllWindows', () => {
  beforeEach(() => {
    createChromeApiMock();
  });

  test('moves tabs from other windows to the focused window', async () => {
    // Arrange
    const windows = [
      { id: 1, focused: true, tabs: [{ id: 10 }] },
      { id: 2, focused: false, tabs: [{ id: 20 }, { id: 21 }] },
    ];
    chrome.windows.getAll.mockResolvedValue(windows);

    // Act
    await mergeAllWindows();

    // Assert
    expect(chrome.tabs.move).toHaveBeenCalledWith([20, 21], { windowId: 1, index: -1 });
    expect(chrome.windows.remove).toHaveBeenCalledWith(2);
  });

  test('should do nothing if only one window exists', async () => {
    // Arrange
    const windows = [{ id: 1, focused: true, tabs: [{ id: 10 }] }];
    chrome.windows.getAll.mockResolvedValue(windows);

    // Act
    await mergeAllWindows();

    // Assert
    expect(chrome.tabs.move).not.toHaveBeenCalled();
  });

  describe('with error logging', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log error if no focused window is found', async () => {
      // Arrange
      const windows = [{ id: 1, focused: false, tabs: [{ id: 10 }] }];
      chrome.windows.getAll.mockResolvedValue(windows);

      // Act
      await mergeAllWindows();

      // Assert
      expect(console.error).toHaveBeenCalledWith('Could not find a focused window to merge tabs into.');
    });

    test('should continue merging other windows if one fails', async () => {
      // Arrange
      const windows = [
        { id: 1, focused: true, tabs: [{ id: 10 }] },
        { id: 2, focused: false, tabs: [{ id: 20 }] },
        { id: 3, focused: false, tabs: [{ id: 30 }] },
      ];
      const moveError = new Error('Move failed');

      chrome.windows.getAll.mockResolvedValue(windows);
      chrome.tabs.move.mockImplementation(async (tabIds) => {
        if (tabIds.includes(20)) throw moveError;
        return undefined;
      });

      // Act
      await mergeAllWindows();

      // Assert
      expect(console.error).toHaveBeenCalledWith('Failed to merge window 2:', moveError);
      expect(chrome.windows.remove).toHaveBeenCalledWith(3);
      expect(chrome.windows.remove).not.toHaveBeenCalledWith(2);
    });

    test('should log top-level error if getAll fails', async () => {
      // Arrange
      const queryError = new Error('Failed to get windows');
      chrome.windows.getAll.mockRejectedValue(queryError);

      // Act
      await mergeAllWindows();

      // Assert
      expect(console.error).toHaveBeenCalledWith('An unexpected error occurred in mergeAllWindows:', queryError);
    });
  });
});
