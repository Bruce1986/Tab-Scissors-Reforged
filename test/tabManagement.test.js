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
    expect(chrome.tabs.move).toHaveBeenCalledWith([2, 3], { windowId: 100, index: -1 });
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

  test('should not create a new window if no active tab is found', async () => {
    // Arrange
    chrome.tabs.query.mockResolvedValueOnce([]); // No active tab found

    // Act
    await splitTabs();

    // Assert
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });

  test('should clean up and log error if new window has no initial tab', async () => {
    // Arrange
    const activeTab = { id: 1, index: 0 };
    const allTabs = [activeTab, { id: 2, index: 1 }];
    const newWindow = { id: 100 };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    chrome.tabs.query
      .mockResolvedValueOnce([activeTab])
      .mockResolvedValueOnce(allTabs)
      .mockResolvedValueOnce([]); // No initial tab found
    chrome.windows.create.mockResolvedValue(newWindow);

    // Act
    await splitTabs();

    // Assert
    expect(console.error).toHaveBeenCalledWith(`Newly created window ${newWindow.id} has no initial tab.`);
    expect(chrome.windows.remove).toHaveBeenCalledWith(newWindow.id);
    expect(chrome.tabs.move).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('should log error if cleanup fails for an empty new window', async () => {
    // Arrange
    const activeTab = { id: 1, index: 0 };
    const allTabs = [activeTab, { id: 2, index: 1 }];
    const newWindow = { id: 100 };
    const cleanupError = new Error('Cleanup failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    chrome.tabs.query
      .mockResolvedValueOnce([activeTab])
      .mockResolvedValueOnce(allTabs)
      .mockResolvedValueOnce([]); // No initial tab
    chrome.windows.create.mockResolvedValue(newWindow);
    chrome.windows.remove.mockRejectedValue(cleanupError);

    // Act
    await splitTabs();

    // Assert
    expect(console.error).toHaveBeenCalledWith(`Newly created window ${newWindow.id} has no initial tab.`);
    expect(console.error).toHaveBeenCalledWith(`Failed to clean up window ${newWindow.id}:`, cleanupError);
    consoleSpy.mockRestore();
  });

  test('should log cleanup error if cleanup fails after a move failure', async () => {
    // Arrange
    const activeTab = { id: 1, index: 0 };
    const allTabs = [activeTab, { id: 2, index: 1 }];
    const newWindow = { id: 100 };
    const initialTab = { id: 99 };
    const moveError = new Error('Move failed');
    const cleanupError = new Error('Cleanup failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    chrome.tabs.query
      .mockResolvedValueOnce([activeTab])
      .mockResolvedValueOnce(allTabs)
      .mockResolvedValueOnce([initialTab]);
    chrome.windows.create.mockResolvedValue(newWindow);
    chrome.tabs.move.mockRejectedValue(moveError);
    chrome.windows.remove.mockRejectedValue(cleanupError);

    // Act
    await splitTabs();

    // Assert
    expect(console.error).toHaveBeenCalledWith('Failed to move tabs:', moveError);
    expect(console.error).toHaveBeenCalledWith(`Failed to clean up window ${newWindow.id} after move failed:`, cleanupError);
    consoleSpy.mockRestore();
  });

  test('should log error but not crash if removing the initial tab fails', async () => {
    // Arrange
    const activeTab = { id: 1, index: 0 };
    const allTabs = [activeTab, { id: 2, index: 1 }];
    const newWindow = { id: 100 };
    const initialTab = { id: 99 };
    const removeError = new Error('Remove failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    chrome.tabs.query
      .mockResolvedValueOnce([activeTab])
      .mockResolvedValueOnce(allTabs)
      .mockResolvedValueOnce([initialTab]);
    chrome.windows.create.mockResolvedValue(newWindow);
    chrome.tabs.remove.mockRejectedValue(removeError);

    // Act & Assert
    await expect(splitTabs()).resolves.not.toThrow();
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
    expect(console.error).toHaveBeenCalledWith('Failed to merge window 2:', removeError);
    consoleSpy.mockRestore();
  });

  test('should do nothing if no other windows have tabs', async () => {
    // Arrange
    const windows = [
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [] } // other window has no tabs
    ];
    chrome.windows.getAll.mockResolvedValue(windows);

    // Act
    await mergeAllWindows();

    // Assert
    expect(chrome.tabs.move).not.toHaveBeenCalled();
    expect(chrome.windows.remove).not.toHaveBeenCalled();
  });

  test('should continue merging other windows if one fails', async () => {
    // Arrange
    const windows = [
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [{ id: 20 }] }, // This one will fail
      { id: 3, tabs: [{ id: 30 }] }, // This one should still be merged
    ];
    const moveError = new Error('Failed to move tabs');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(
      () => {}
    );

    chrome.windows.getAll.mockResolvedValue(windows);
    // Fail the first move, then succeed on the second
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

    consoleSpy.mockRestore();
  });
});
