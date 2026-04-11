import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let splitHandler;
let mergeHandler;

function createButton(handlerSetter) {
  const button = {
    disabled: false,
    addEventListener: jest.fn((eventName, handler) => {
      if (eventName === 'click') {
        handlerSetter(handler);
      }
    }),
    toggleAttribute: jest.fn((name, force) => {
      if (name === 'disabled') {
        button.disabled = force;
      }
    })
  };

  return button;
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
  const statusElement = {
    textContent: '',
    dataset: {}
  };

  global.document = {
    getElementById: jest.fn(id => {
      if (id === 'split') {
        return splitButton;
      }

      if (id === 'merge') {
        return mergeButton;
      }

      if (id === 'status') {
        return statusElement;
      }

      return null;
    })
  };

  global.chrome = {
    windows: { getCurrent: jest.fn().mockResolvedValue({ id: 321 }) },
    runtime: { sendMessage: jest.fn().mockResolvedValue({ status: 'success' }) }
  };

  await import(`../src/popup.js?test=${Date.now()}`);

  return { splitButton, mergeButton, statusElement };
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
    const { splitButton, mergeButton } = await importPopupModule();

    await splitHandler();

    expect(chrome.windows.getCurrent).toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'split', windowId: 321 });
    expect(splitButton.toggleAttribute).toHaveBeenNthCalledWith(1, 'disabled', true);
    expect(mergeButton.toggleAttribute).toHaveBeenNthCalledWith(1, 'disabled', true);
    expect(splitButton.toggleAttribute).toHaveBeenLastCalledWith('disabled', false);
    expect(mergeButton.toggleAttribute).toHaveBeenLastCalledWith('disabled', false);
  });

  test('sends a merge action for the current window', async () => {
    await importPopupModule();

    await mergeHandler();

    expect(chrome.windows.getCurrent).toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'merge', windowId: 321 });
  });

  test('logs an error when the service worker returns an error response', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { statusElement } = await importPopupModule();
    chrome.runtime.sendMessage.mockResolvedValue({ status: 'error', message: 'Split failed' });

    await splitHandler();

    expect(errorSpy).toHaveBeenCalledWith('Split action failed:', expect.any(Error));
    expect(statusElement.textContent).toBe('Split action failed: Split failed');
    expect(statusElement.dataset.state).toBe('error');

    errorSpy.mockRestore();
  });

  test('logs an error when the service worker does not reply', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { statusElement } = await importPopupModule();
    chrome.runtime.sendMessage.mockResolvedValue(undefined);

    await mergeHandler();

    expect(errorSpy).toHaveBeenCalledWith('Merge action failed:', expect.any(Error));
    expect(statusElement.textContent).toBe('Merge action failed: Merge action failed.');
    expect(statusElement.dataset.state).toBe('error');

    errorSpy.mockRestore();
  });

  test('clears any previous error message before retrying an action', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { statusElement } = await importPopupModule();
    chrome.runtime.sendMessage.mockResolvedValue({ status: 'error', message: 'Split failed' });

    await splitHandler();
    expect(statusElement.textContent).toBe('Split action failed: Split failed');

    chrome.runtime.sendMessage.mockResolvedValue({ status: 'success' });
    await mergeHandler();

    expect(statusElement.textContent).toBe('');
    expect(statusElement.dataset.state).toBe('');

    errorSpy.mockRestore();
  });

  test('ignores rapid repeated clicks while an action is already running', async () => {
    let resolveMessage;
    const pendingMessage = new Promise(resolve => {
      resolveMessage = resolve;
    });
    const { splitButton, mergeButton } = await importPopupModule();

    chrome.runtime.sendMessage.mockReturnValue(pendingMessage);

    const firstCall = splitHandler();
    const secondCall = splitHandler();
    await Promise.resolve();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(splitButton.toggleAttribute).toHaveBeenNthCalledWith(1, 'disabled', true);
    expect(mergeButton.toggleAttribute).toHaveBeenNthCalledWith(1, 'disabled', true);

    resolveMessage({ status: 'success' });
    await firstCall;
    await secondCall;

    expect(splitButton.toggleAttribute).toHaveBeenLastCalledWith('disabled', false);
    expect(mergeButton.toggleAttribute).toHaveBeenLastCalledWith('disabled', false);
  });
});
