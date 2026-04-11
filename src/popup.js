const splitBtn = document.getElementById('split');
const mergeBtn = document.getElementById('merge');
const statusEl = document.getElementById('status');
let isActionPending = false;

function setStatus(message, state = '') {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function setButtonsDisabled(disabled) {
  splitBtn?.toggleAttribute('disabled', disabled);
  mergeBtn?.toggleAttribute('disabled', disabled);
}

async function performAction(action) {
  if (isActionPending) {
    return;
  }

  isActionPending = true;
  setButtonsDisabled(true);
  const label = action === 'split' ? 'Split' : 'Merge';
  setStatus('');

  try {
    const currentWindow = await chrome.windows.getCurrent();
    const response = await chrome.runtime.sendMessage({ action, windowId: currentWindow.id });

    if (!response || response.status === 'error') {
      throw new Error(response?.message ?? `${label} action failed.`);
    }
  } catch (error) {
    setStatus(`${label} action failed: ${error.message}`, 'error');
    console.error(`${label} action failed:`, error);
  } finally {
    isActionPending = false;
    setButtonsDisabled(false);
  }
}

if (splitBtn) {
  splitBtn.addEventListener('click', () => performAction('split'));
}

if (mergeBtn) {
  mergeBtn.addEventListener('click', () => performAction('merge'));
}
