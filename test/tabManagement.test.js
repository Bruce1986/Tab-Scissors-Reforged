import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { splitTabs, mergeAllWindows } from '../src/tabManagement.js';

describe('splitTabs', () => {
  beforeEach(() => {
    // Mock chrome APIs for each test to ensure isolation
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
        remove: jest.fn(),
      },
    };
  });

  test('should move tabs to the right of the active tab to a new window', async () => {
    // Arrange: Mock tabs and window data
    const activeTab = { id: 1, index: 0 };
    const tabsToMove = [{ id: 2, index: 1 }, { id: 3, index: 2 }];
    const allTabs = [activeTab, ...tabsToMove];
    const newWindow = { id: 100, tabs: [{ id: 99 }] }; // New window with a blank tab

    chrome.tabs.query.mockResolvedValueOnce([activeTab]); // For active tab query
    chrome.tabs.query.mockResolvedValueOnce(allTabs); // For all tabs query
    chrome.windows.create.mockResolvedValue(newWindow);

    // Act: Call the function
    await splitTabs();

    // Assert: Verify the correct API calls were made
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
    expect(chrome.tabs.move).not.toHaveBeenCalled();
    expect(chrome.tabs.remove).not.toHaveBeenCalled();
  });

  test('should handle a single tab to the right correctly', async () => {
    // Arrange
    const activeTab = { id: 1, index: 0 };
    const tabToMove = { id: 2, index: 1 };
    const allTabs = [activeTab, tabToMove];
    const newWindow = { id: 101, tabs: [{ id: 199 }] };

    chrome.tabs.query.mockResolvedValueOnce([activeTab]);
    chrome.tabs.query.mockResolvedValueOnce(allTabs);
    chrome.windows.create.mockResolvedValue(newWindow);

    // Act
    await splitTabs();

    // Assert
    expect(chrome.windows.create).toHaveBeenCalledWith({ state: 'normal' });
    expect(chrome.tabs.move).toHaveBeenCalledWith([tabToMove.id], { windowId: newWindow.id, index: -1 });
    expect(chrome.tabs.remove).toHaveBeenCalledWith(newWindow.tabs[0].id);
  });

  test('should not fail if no active tab is found', async () => {
    // Arrange
    chrome.tabs.query.mockResolvedValueOnce([]); // No active tab

    // Act
    await splitTabs();

    // Assert
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });
});

describe('mergeAllWindows', () => {
  beforeEach(() => {
    // Mock chrome APIs for each test
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
    // Common setup for mergeAllWindows tests
    chrome.windows.getCurrent.mockResolvedValue({ id: 1 });
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

  test('logs error if window removal fails', async () => {
    const error = new Error('Removal failed');
    chrome.windows.getAll.mockResolvedValue([
      { id: 1, tabs: [{ id: 10 }] },
      { id: 2, tabs: [{ id: 20 }] }
    ]);
    chrome.windows.remove.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await mergeAllWindows();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to remove window 2:', error);
    consoleSpy.mockRestore();
  });
});
