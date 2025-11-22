const splitBtn = document.getElementById('split');
const mergeBtn = document.getElementById('merge');

splitBtn.addEventListener('click', async () => {
  const currentWindow = await chrome.windows.getCurrent();
  chrome.runtime.sendMessage({ action: 'split', windowId: currentWindow.id });
});

mergeBtn.addEventListener('click', async () => {
  const currentWindow = await chrome.windows.getCurrent();
  chrome.runtime.sendMessage({ action: 'merge', windowId: currentWindow.id });
});
