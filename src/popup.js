const splitBtn = document.getElementById('split');
const mergeBtn = document.getElementById('merge');

if (splitBtn) {
  splitBtn.addEventListener('click', async () => {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      const response = await chrome.runtime.sendMessage({ action: 'split', windowId: currentWindow.id });
      if (response?.status === 'error') {
        throw new Error(response.message ?? 'Split action failed.');
      }
    } catch (error) {
      console.error('Split action failed:', error);
    }
  });
}

if (mergeBtn) {
  mergeBtn.addEventListener('click', async () => {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      const response = await chrome.runtime.sendMessage({ action: 'merge', windowId: currentWindow.id });
      if (response?.status === 'error') {
        throw new Error(response.message ?? 'Merge action failed.');
      }
    } catch (error) {
      console.error('Merge action failed:', error);
    }
  });
}
