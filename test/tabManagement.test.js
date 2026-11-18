import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { splitTabs, mergeAllWindows } from '../src/tabManagement.js';

// Helper function to create a mock of the Chrome API for test isolation
const createChromeApiMock = () => {
  global.chrome = {
    tabs: {
      // Default: an empty window. Tests override this per call where needed.
      query: jest.fn().mockResolvedValue([]),
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
    // The new window must not be torn down on the success path.
    expect(chrome.windows.remove).not.toHaveBeenCalled();
  });

  test('should do nothing if no tab is active', async () => {
    chrome.tabs.query.mockResolvedValueOnce([{ id: 1, active: false, index: 0 }]);

    await splitTabs();

    expect(chrome.windows.create).not.toHaveBeenCalled();
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
        .mockResolvedValueOnce([initialTab])
        .mockResolvedValueOnce([initialTab]); // cleanup: only the initial tab is left
      chrome.windows.create.mockResolvedValue(newWindow);
      chrome.tabs.move.mockRejectedValue(moveError);

      // Act
      await splitTabs();

      // Assert
      expect(console.error).toHaveBeenCalledWith('Failed to prepare the new window or move tabs:', moveError);
      expect(chrome.tabs.query).toHaveBeenLastCalledWith({ windowId: newWindow.id });
      expect(chrome.windows.remove).toHaveBeenCalledWith(newWindow.id);
      expect(chrome.tabs.remove).not.toHaveBeenCalled();
    });

    test('should keep the new window if a partial move already put user tabs in it', async () => {
      const allTabs = [
        { id: 1, active: true, index: 0 },
        { id: 2, active: false, index: 1 },
        { id: 3, active: false, index: 2 },
      ];
      const newWindow = { id: 100 };
      const initialTab = { id: 99 };
      const moveError = new Error('Move failed part-way');

      chrome.tabs.query
        .mockResolvedValueOnce(allTabs)
        .mockResolvedValueOnce([initialTab])
        .mockResolvedValueOnce([initialTab, { id: 2 }]); // tab 2 made it across
      chrome.windows.create.mockResolvedValue(newWindow);
      chrome.tabs.move.mockRejectedValue(moveError);

      await splitTabs();

      expect(chrome.windows.remove).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        `Kept window ${newWindow.id} because some tabs were already moved into it.`
      );
    });

    test('should clean up the new window if it has no initial tab', async () => {
      const allTabs = [
        { id: 1, active: true, index: 0 },
        { id: 2, active: false, index: 1 },
      ];
      const newWindow = { id: 100 };

      chrome.tabs.query
        .mockResolvedValueOnce(allTabs)
        .mockResolvedValueOnce([]) // new window reports no initial tab
        .mockResolvedValueOnce([]);
      chrome.windows.create.mockResolvedValue(newWindow);

      await splitTabs();

      expect(chrome.tabs.move).not.toHaveBeenCalled();
      expect(chrome.windows.remove).toHaveBeenCalledWith(newWindow.id);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to prepare the new window or move tabs:',
        expect.any(Error)
      );
    });

    test('should not close the new window if only initial-tab removal fails', async () => {
      const allTabs = [
        { id: 1, active: true, index: 0 },
        { id: 2, active: false, index: 1 },
      ];
      const newWindow = { id: 100 };
      const initialTab = { id: 99 };
      const removeError = new Error('Failed to remove tab');

      chrome.tabs.query
        .mockResolvedValueOnce(allTabs)
        .mockResolvedValueOnce([initialTab]);
      chrome.windows.create.mockResolvedValue(newWindow);
      chrome.tabs.remove.mockRejectedValue(removeError);

      await splitTabs();

      expect(chrome.tabs.move).toHaveBeenCalledWith([2], { windowId: 100, index: -1 });
      expect(console.error).toHaveBeenCalledWith(
        `Failed to remove initial tab ${initialTab.id}:`,
        removeError
      );
      expect(chrome.windows.remove).not.toHaveBeenCalled();
    });

    test('should log if cleaning up the new window fails', async () => {
      const allTabs = [
        { id: 1, active: true, index: 0 },
        { id: 2, active: false, index: 1 },
      ];
      const newWindow = { id: 100 };
      const cleanupError = new Error('Window remove failed');

      chrome.tabs.query
        .mockResolvedValueOnce(allTabs)
        .mockResolvedValueOnce([{ id: 99 }])
        .mockResolvedValueOnce([{ id: 99 }]);
      chrome.windows.create.mockResolvedValue(newWindow);
      chrome.tabs.move.mockRejectedValue(new Error('Move failed'));
      chrome.windows.remove.mockRejectedValue(cleanupError);

      await splitTabs();

      expect(console.error).toHaveBeenCalledWith(
        `Failed to clean up window ${newWindow.id} after an error:`,
        cleanupError
      );
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
    expect(chrome.windows.getAll).toHaveBeenCalledWith({
      populate: true,
      windowTypes: ['normal'],
    });
    expect(chrome.tabs.move).toHaveBeenCalledWith([20, 21], { windowId: 1, index: -1 });
    expect(chrome.tabs.query).toHaveBeenCalledWith({ windowId: 2 });
    expect(chrome.windows.remove).toHaveBeenCalledTimes(1);
    expect(chrome.windows.remove).toHaveBeenCalledWith(2);
  });

  test('skips windows without tabs', async () => {
    const windows = [
      { id: 1, focused: true, tabs: [{ id: 10 }] },
      { id: 2, focused: false, tabs: [] },
      { id: 3, focused: false },
    ];
    chrome.windows.getAll.mockResolvedValue(windows);

    await mergeAllWindows();

    expect(chrome.tabs.move).not.toHaveBeenCalled();
    expect(chrome.windows.remove).not.toHaveBeenCalled();
  });

  test('should do nothing if only one window exists', async () => {
    // Arrange
    const windows = [{ id: 1, focused: true, tabs: [{ id: 10 }] }];
    chrome.windows.getAll.mockResolvedValue(windows);

    // Act
    await mergeAllWindows();

    // Assert
    expect(chrome.tabs.move).not.toHaveBeenCalled();
    expect(chrome.windows.remove).not.toHaveBeenCalled();
  });

  describe('with error logging', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('does not report a failure when Chrome already closed the emptied window', async () => {
      const windows = [
        { id: 1, focused: true, tabs: [{ id: 10 }] },
        { id: 2, focused: false, tabs: [{ id: 20 }] },
      ];
      chrome.windows.getAll.mockResolvedValue(windows);
      chrome.windows.remove.mockRejectedValue(new Error('No window with id: 2.'));

      await mergeAllWindows();

      expect(chrome.tabs.move).toHaveBeenCalledWith([20], { windowId: 1, index: -1 });
      expect(console.error).not.toHaveBeenCalled();
    });

    test('leaves a window open if it gained tabs during the merge', async () => {
      const windows = [
        { id: 1, focused: true, tabs: [{ id: 10 }] },
        { id: 2, focused: false, tabs: [{ id: 20 }] },
      ];
      chrome.windows.getAll.mockResolvedValue(windows);
      chrome.tabs.query.mockResolvedValueOnce([{ id: 22 }]); // opened after getAll()

      await mergeAllWindows();

      expect(chrome.windows.remove).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'Window 2 still has 1 tab(s) after merging; leaving it open.'
      );
    });

    test('should log error if no focused window is found', async () => {
      // Arrange
      const windows = [{ id: 1, focused: false, tabs: [{ id: 10 }] }];
      chrome.windows.getAll.mockResolvedValue(windows);

      // Act
      await mergeAllWindows();

      // Assert
      expect(console.error).toHaveBeenCalledWith('Could not find a focused window to merge tabs into.');
      expect(chrome.tabs.move).not.toHaveBeenCalled();
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
