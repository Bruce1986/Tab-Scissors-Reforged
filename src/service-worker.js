import { splitTabs, mergeAllWindows } from './tabManagement.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'split') {
    splitTabs();
  } else if (message.action === 'merge') {
    mergeAllWindows();
  }
});
