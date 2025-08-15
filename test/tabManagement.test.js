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
    const allTabs = [activeTab, { id: 2, index: 1 }, { id: 3, index: 2 }];
    const newWindow = { id: 100 };
    const initialTab = { id: 99 };

    chrome.tabs.query
      .mockResolvedValueOnce([activeTab])
      .mockResolvedValueOnce(allTabs)
      .mockResolvedValueOnce([initialTab]);
    chrome.windows.create.mockResolvedValue(newWindow);

    // Act
    await splitTabs();

    // Assert
    expect(chrome.windows.create).toHaveBeenCalledWith({ state: 'normal' });
    expect(chrome.tabs.query).toHaveBeenCalledWith({ windowId: newWindow.id });
    expect(chrome.tabs.move).toHaveBeenCalledWith([2, 3], {
      windowId: 100,
      index: -1,
    });
    expect(chrome.tabs.remove).toHaveBeenCalledWith(initialTab.id);
  });

  test('should do nothing if there are no tabs to the right', async () => {
    // Arrange
    const activeTab = { id: 3, index: 2 };
    const allTabs = [{ id: 1, index: 0 }, { id: 2, index: 1 }, activeTab];
    chrome.tabs.query
      .mockResolvedValueOnce([activeTab])
      .mockResolvedValueOnce(allTabs);

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

    test('should log top-level error if active tab query fails', async () => {
      // Arrange
      const queryError = new Error('Failed to query active tab');
      chrome.tabs.query.mockRejectedValue(queryError);

      // Act
      await splitTabs();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'An unexpected error occurred in splitTabs:',
        queryError
      );
    });

    test('should log top-level error if window creation fails', async () => {
      // Arrange
      const activeTab = { id: 1, index: 0 };
      const allTabs = [activeTab, { id: 2, index: 1 }];
      const createError = new Error('Failed to create window');

      chrome.tabs.query
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce(allTabs);
      chrome.windows.create.mockRejectedValue(createError);

      // Act
      await splitTabs();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'An unexpected error occurred in splitTabs:',
        createError
      );
    });

    test('should clean up if querying for initial tab fails', async () => {
      // Arrange
      const activeTab = { id: 1, index: 0 };
      const allTabs = [activeTab, { id: 2, index: 1 }];
      const newWindow = { id: 100 };
      const queryError = new Error('Query for initial tab failed');

      chrome.tabs.query
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce(allTabs)
        .mockRejectedValueOnce(queryError); // Fail the third query
      chrome.windows.create.mockResolvedValue(newWindow);

      // Act
      await splitTabs();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'Failed to prepare the new window or move tabs:',
        queryError
      );
      expect(chrome.windows.remove).toHaveBeenCalledWith(newWindow.id);
    });

    test('should clean up if moving tabs fails', async () => {
      // Arrange
      const activeTab = { id: 1, index: 0 };
      const allTabs = [activeTab, { id: 2, index: 1 }];
      const newWindow = { id: 100 };
      const initialTab = { id: 99 };
      const moveError = new Error('Move failed');

      chrome.tabs.query
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce(allTabs)
        .mockResolvedValueOnce([initialTab]);
      chrome.windows.create.mockResolvedValue(newWindow);
      chrome.tabs.move.mockRejectedValue(moveError);

      // Act
      await splitTabs();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'Failed to prepare the new window or move tabs:',
        moveError
      );
      expect(chrome.windows.remove).toHaveBeenCalledWith(newWindow.id);
    });

    test('should not clean up if final tab removal fails', async () => {
      // Arrange
      const activeTab = { id: 1, index: 0 };
      const allTabs = [activeTab, { id: 2, index: 1 }];
      const newWindow = { id: 100 };
      const initialTab = { id: 99 };
      const removeError = new Error('Remove failed');

      chrome.tabs.query
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce(allTabs)
        .mockResolvedValueOnce([initialTab]);
      chrome.windows.create.mockResolvedValue(newWindow);
      chrome.tabs.remove.mockRejectedValue(removeError);

      // Act
      await splitTabs();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        `Failed to remove initial tab ${initialTab.id}:`,
        removeError
      );
      expect(console.error).not.toHaveBeenCalledWith(
        'Failed to prepare the new window or move tabs:',
        expect.any(Error)
      );
      expect(chrome.windows.remove).not.toHaveBeenCalled();
    });
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
      { id: 2, tabs: [{ id: 20 }, { id: 21 }] },
    ];
    chrome.windows.getAll.mockResolvedValue(windows);

    // Act
    await mergeAllWindows();

    // Assert
    expect(chrome.tabs.move).toHaveBeenCalledWith([20, 21], {
      windowId: 1,
      index: -1,
    });
    expect(chrome.windows.remove).toHaveBeenCalledWith(2);
  });

  test('should do nothing if no other windows have tabs', async () => {
    // Arrange
    const windows = [
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [] }, // other window has no tabs
    ];
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

    test('logs error if window removal fails', async () => {
      // Arrange
      const windows = [
        { id: 1, tabs: [{ id: 10 }] },
        { id: 2, tabs: [{ id: 20 }] },
      ];
      const removeError = new Error('Removal failed');

      chrome.windows.getAll.mockResolvedValue(windows);
      chrome.windows.remove.mockRejectedValue(removeError);

      // Act
      await mergeAllWindows();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'Failed to merge window 2:',
        removeError
      );
    });

    test('should continue merging other windows if one fails', async () => {
      // Arrange
      const windows = [
        { id: 1, tabs: [{ id: 10 }] },
        { id: 2, tabs: [{ id: 20 }] }, // This one will fail
        { id: 3, tabs: [{ id: 30 }] }, // This one should still be merged
      ];
      const moveError = new Error('Failed to move tabs');

      chrome.windows.getAll.mockResolvedValue(windows);
      // Fail the first move, then succeed on the second, to test sequential loop
      chrome.tabs.move
        .mockRejectedValueOnce(moveError)
        .mockResolvedValueOnce(undefined);

      // Act
      await mergeAllWindows();

      // Assert
      // Check that it tried to move tabs for the failing window
      expect(chrome.tabs.move).toHaveBeenCalledWith([20], {
        windowId: 1,
        index: -1,
      });
      // Check that the error was logged
      expect(console.error).toHaveBeenCalledWith(
        'Failed to merge window 2:',
        moveError
      );

      // Check that it still merged the next window
      expect(chrome.tabs.move).toHaveBeenCalledWith([30], {
        windowId: 1,
        index: -1,
      });
      // Check that it removed the successfully merged window
      expect(chrome.windows.remove).toHaveBeenCalledWith(3);
      // Check that it did NOT remove the failed window
      expect(chrome.windows.remove).not.toHaveBeenCalledWith(2);
    });

    test('should log top-level error if initial windows query fails', async () => {
      // Arrange
      const queryError = new Error('Failed to get windows');
      chrome.windows.getAll.mockRejectedValue(queryError);

      // Act
      await mergeAllWindows();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'An unexpected error occurred in mergeAllWindows:',
        queryError
      );
    });
  });
});
