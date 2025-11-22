// src/service-worker.js
import { splitTabs, mergeAllWindows } from './tabManagement.js';

// Handle extension icon click (Split action by default)
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    splitTabs(tab.windowId);
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const currentWindow = await chrome.windows.getCurrent();
  if (command === 'split-tabs') {
    splitTabs(currentWindow.id);
  } else if (command === 'merge-windows') {
    mergeAllWindows(currentWindow.id);
  }
});