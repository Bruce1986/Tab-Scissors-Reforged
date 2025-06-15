const splitBtn = document.getElementById('split');
const mergeBtn = document.getElementById('merge');

splitBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'split' });
});

mergeBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'merge' });
});
