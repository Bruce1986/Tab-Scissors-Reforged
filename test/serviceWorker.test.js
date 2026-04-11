import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const splitTabs = jest.fn();
const mergeAllWindows = jest.fn();

jest.unstable_mockModule('../src/tabManagement.js', () => ({
  splitTabs,
  mergeAllWindows
}));

// Mock chrome global
global.chrome = {
  runtime: { onMessage: { addListener: jest.fn() } },
  commands: { onCommand: { addListener: jest.fn() } },
  windows: { getCurrent: jest.fn() }
};

const { handleCommand, handleMessage } = await import('../src/service-worker.js');

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

describe('handleMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    splitTabs.mockResolvedValue(undefined);
    mergeAllWindows.mockResolvedValue(undefined);
  });

  test('calls splitTabs when action is split and keeps the message channel open', async () => {
    const sendResponse = jest.fn();

    const result = handleMessage({ action: 'split', windowId: 123 }, {}, sendResponse);

    expect(splitTabs).toHaveBeenCalledWith(123);
    expect(result).toBe(true);

    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith({ status: 'success' });
  });

  test('returns an error response when splitTabs rejects', async () => {
    const sendResponse = jest.fn();
    splitTabs.mockRejectedValue(new Error('Split failed'));

    const result = handleMessage({ action: 'split', windowId: 123 }, {}, sendResponse);

    expect(result).toBe(true);

    await Promise.resolve();
    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith({ status: 'error', message: 'Split failed' });
  });

  test('calls mergeAllWindows when action is merge and keeps the message channel open', async () => {
    const sendResponse = jest.fn();

    const result = handleMessage({ action: 'merge', windowId: 789 }, {}, sendResponse);

    expect(mergeAllWindows).toHaveBeenCalledWith(789);
    expect(result).toBe(true);

    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith({ status: 'success' });
  });

  test('returns an error response when mergeAllWindows rejects', async () => {
    const sendResponse = jest.fn();
    mergeAllWindows.mockRejectedValue(new Error('Merge failed'));

    const result = handleMessage({ action: 'merge', windowId: 789 }, {}, sendResponse);

    expect(result).toBe(true);

    await Promise.resolve();
    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith({ status: 'error', message: 'Merge failed' });
  });

  test('rejects duplicate in-flight actions for the same window', async () => {
    let resolveSplit;
    const pendingSplit = new Promise(resolve => {
      resolveSplit = resolve;
    });
    const firstResponse = jest.fn();
    const secondResponse = jest.fn();
    splitTabs.mockReturnValue(pendingSplit);

    const firstResult = handleMessage({ action: 'split', windowId: 123 }, {}, firstResponse);
    const secondResult = handleMessage({ action: 'split', windowId: 123 }, {}, secondResponse);

    expect(firstResult).toBe(true);
    expect(secondResult).toBeUndefined();
    expect(splitTabs).toHaveBeenCalledTimes(1);
    expect(secondResponse).toHaveBeenCalledWith({ status: 'error', message: 'split action already in progress.' });

    resolveSplit();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const thirdResponse = jest.fn();
    const thirdResult = handleMessage({ action: 'split', windowId: 123 }, {}, thirdResponse);

    expect(thirdResult).toBe(true);
  });

  test('ignores unknown action', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

    handleMessage({ action: 'unknown', windowId: 100 }, {}, jest.fn());

    expect(splitTabs).not.toHaveBeenCalled();
    expect(mergeAllWindows).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[Tab Scissors] Unsupported action: unknown');

    warnSpy.mockRestore();
  });

  test('does not throw on malformed message payload', () => {
    expect(() => handleMessage(null, {}, jest.fn())).not.toThrow();
    expect(() => handleMessage(undefined, {}, jest.fn())).not.toThrow();
    expect(() => handleMessage('split', {}, jest.fn())).not.toThrow();
    expect(splitTabs).not.toHaveBeenCalled();
    expect(mergeAllWindows).not.toHaveBeenCalled();
  });

  test('ignores messages with invalid windowId', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    const sendResponse = jest.fn();

    handleMessage({ action: 'split' }, {}, sendResponse);
    handleMessage({ action: 'merge', windowId: '789' }, {}, sendResponse);

    expect(splitTabs).not.toHaveBeenCalled();
    expect(mergeAllWindows).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[Tab Scissors] Invalid or missing windowId in message.');
    expect(sendResponse).toHaveBeenNthCalledWith(1, { status: 'error', message: 'Invalid or missing windowId' });
    expect(sendResponse).toHaveBeenNthCalledWith(2, { status: 'error', message: 'Invalid or missing windowId' });

    warnSpy.mockRestore();
  });
});
