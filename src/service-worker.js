import { splitTabs, mergeAllWindows } from './tabManagement.js';

/**
 * Handle incoming runtime messages.
 * Extracted for easier unit testing.
 * @param {object} message - runtime message
 */
export function handleMessage(message) {
  if (message.action === 'split') {
    splitTabs();
  } else if (message.action === 'merge') {
    mergeAllWindows();
  }
}

if (globalThis.chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message);
  });
}
