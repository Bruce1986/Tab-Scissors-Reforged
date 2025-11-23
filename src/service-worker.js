// src/service-worker.js
import { splitTabs, mergeAllWindows } from './tabManagement.js';

export function handleActionClick(tab) {
  if (tab.windowId) {
    splitTabs(tab.windowId);
  }
}

export async function handleCommand(command) {
  const currentWindow = await chrome.windows.getCurrent();
  if (command === 'split-tabs') {
    splitTabs(currentWindow.id);
  } else if (command === 'merge-windows') {
    mergeAllWindows(currentWindow.id);
  }
}

// Handle extension icon click (Split action by default)
if (globalThis.chrome?.action) {
  chrome.action.onClicked.addListener(handleActionClick);
}

// Handle keyboard shortcuts
if (globalThis.chrome?.commands) {
  chrome.commands.onCommand.addListener(handleCommand);
}
