import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const splitTabs = jest.fn();
const mergeAllWindows = jest.fn();

jest.unstable_mockModule('../src/tabManagement.js', () => ({
  splitTabs,
  mergeAllWindows
}));

// Mock chrome global
global.chrome = {
  action: { onClicked: { addListener: jest.fn() } },
  commands: { onCommand: { addListener: jest.fn() } },
  windows: { getCurrent: jest.fn() }
};

const { handleActionClick, handleCommand } = await import('../src/service-worker.js');

describe('handleActionClick', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls splitTabs with windowId', () => {
    handleActionClick({ windowId: 123 });
    expect(splitTabs).toHaveBeenCalledWith(123);
  });

  test('does nothing if windowId is missing', () => {
    handleActionClick({});
    expect(splitTabs).not.toHaveBeenCalled();
  });
});

describe('handleCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chrome.windows.getCurrent.mockResolvedValue({ id: 456 });
  });

  test('calls splitTabs for split-tabs command', async () => {
    await handleCommand('split-tabs');
    expect(splitTabs).toHaveBeenCalledWith(456);
  });

  test('calls mergeAllWindows for merge-windows command', async () => {
    await handleCommand('merge-windows');
    expect(mergeAllWindows).toHaveBeenCalledWith(456);
  });

  test('ignores unknown command', async () => {
    await handleCommand('unknown');
    expect(splitTabs).not.toHaveBeenCalled();
    expect(mergeAllWindows).not.toHaveBeenCalled();
  });
});
