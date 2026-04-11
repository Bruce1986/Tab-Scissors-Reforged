import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let splitHandler;
let mergeHandler;

function createButton(handlerSetter) {
  return {
    addEventListener: jest.fn((eventName, handler) => {
      if (eventName === 'click') {
        handlerSetter(handler);
      }
    })
  };
}

async function importPopupModule() {
  jest.resetModules();
  splitHandler = undefined;
  mergeHandler = undefined;

  const splitButton = createButton(handler => {
    splitHandler = handler;
  });
  const mergeButton = createButton(handler => {
    mergeHandler = handler;
  });

  global.document = {
    getElementById: jest.fn(id => {
      if (id === 'split') {
        return splitButton;
      }

      if (id === 'merge') {
        return mergeButton;
      }

      return null;
    })
  };

  global.chrome = {
    windows: { getCurrent: jest.fn().mockResolvedValue({ id: 321 }) },
    runtime: { sendMessage: jest.fn().mockResolvedValue({ status: 'success' }) }
  };

  await import(`../src/popup.js?test=${Date.now()}`);

  return { splitButton, mergeButton };
}

describe('popup actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers split and merge click handlers', async () => {
    const { splitButton, mergeButton } = await importPopupModule();

    expect(splitButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mergeButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  test('sends a split action for the current window', async () => {
    await importPopupModule();

    await splitHandler();

    expect(chrome.windows.getCurrent).toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'split', windowId: 321 });
  });

  test('sends a merge action for the current window', async () => {
    await importPopupModule();

    await mergeHandler();

    expect(chrome.windows.getCurrent).toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'merge', windowId: 321 });
  });

  test('logs an error when the service worker returns an error response', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await importPopupModule();
    chrome.runtime.sendMessage.mockResolvedValue({ status: 'error', message: 'Split failed' });

    await splitHandler();

    expect(errorSpy).toHaveBeenCalledWith('Split action failed:', expect.any(Error));

    errorSpy.mockRestore();
  });

  test('logs an error when the service worker does not reply', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await importPopupModule();
    chrome.runtime.sendMessage.mockResolvedValue(undefined);

    await mergeHandler();

    expect(errorSpy).toHaveBeenCalledWith('Merge action failed:', expect.any(Error));

    errorSpy.mockRestore();
  });
});
