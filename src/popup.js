const splitBtn = document.getElementById('split');
const mergeBtn = document.getElementById('merge');

async function performAction(action) {
  const label = action === 'split' ? 'Split' : 'Merge';

  try {
    const currentWindow = await chrome.windows.getCurrent();
    const response = await chrome.runtime.sendMessage({ action, windowId: currentWindow.id });

    if (!response || response.status === 'error') {
      throw new Error(response?.message ?? `${label} action failed.`);
    }
  } catch (error) {
    console.error(`${label} action failed:`, error);
  }
}

if (splitBtn) {
  splitBtn.addEventListener('click', () => performAction('split'));
}

if (mergeBtn) {
  mergeBtn.addEventListener('click', () => performAction('merge'));
}
