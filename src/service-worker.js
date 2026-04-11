// src/service-worker.js
import { splitTabs, mergeAllWindows } from './tabManagement.js';

export async function handleCommand(command) {
  const currentWindow = await chrome.windows.getCurrent();
  if (command === 'split-tabs') {
    splitTabs(currentWindow.id);
  } else if (command === 'merge-windows') {
    mergeAllWindows(currentWindow.id);
  }
}

export function handleMessage(message, _sender, _sendResponse) {
  if (!message || typeof message !== 'object' || typeof message.action !== 'string') {
    return;
  }

  if (!Number.isInteger(message.windowId)) {
    console.warn('[Tab Scissors] Invalid or missing windowId in message.');
    return;
  }

  if (message.action === 'split') {
    splitTabs(message.windowId)
      .then(() => _sendResponse?.({ status: 'success' }))
      .catch(error => _sendResponse?.({ status: 'error', message: error.message }));
    return true;
  } else if (message.action === 'merge') {
    mergeAllWindows(message.windowId)
      .then(() => _sendResponse?.({ status: 'success' }))
      .catch(error => _sendResponse?.({ status: 'error', message: error.message }));
    return true;
  } else {
    console.warn(`[Tab Scissors] Unsupported action: ${message.action}`);
  }
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
