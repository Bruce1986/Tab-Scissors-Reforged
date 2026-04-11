// src/service-worker.js
import { splitTabs, mergeAllWindows } from './tabManagement.js';

const pendingActions = new Set();

export async function handleCommand(command) {
  const currentWindow = await chrome.windows.getCurrent();
  if (command === 'split-tabs') {
    splitTabs(currentWindow.id);
  } else if (command === 'merge-windows') {
    mergeAllWindows(currentWindow.id);
  }
}

export function handleMessage(message, _sender, sendResponse) {
  if (!message || typeof message !== 'object' || typeof message.action !== 'string') {
    return;
  }

  if (!Number.isInteger(message.windowId)) {
    console.warn('[Tab Scissors] Invalid or missing windowId in message.');
    sendResponse?.({ status: 'error', message: 'Invalid or missing windowId' });
    return;
  }

  const actionHandler = message.action === 'split'
    ? splitTabs
    : message.action === 'merge'
      ? mergeAllWindows
      : null;

  if (!actionHandler) {
    console.warn(`[Tab Scissors] Unsupported action: ${message.action}`);
    return;
  }

  const pendingKey = `${message.action}:${message.windowId}`;
  if (pendingActions.has(pendingKey)) {
    sendResponse?.({ status: 'error', message: `${message.action} action already in progress.` });
    return;
  }

  pendingActions.add(pendingKey);
  actionHandler(message.windowId)
    .then(() => sendResponse?.({ status: 'success' }))
    .catch(error => sendResponse?.({ status: 'error', message: error.message }))
    .finally(() => pendingActions.delete(pendingKey));

  return true;
}

// Handle messages from popup
if (globalThis.chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(handleMessage);
} else {
  console.warn('[Tab Scissors] chrome.runtime.onMessage API is not available.');
}

// Handle keyboard shortcuts
if (globalThis.chrome?.commands) {
  chrome.commands.onCommand.addListener(handleCommand);
} else {
  console.warn('[Tab Scissors] chrome.commands API is not available.');
}
