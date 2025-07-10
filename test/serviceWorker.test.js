import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const splitTabs = jest.fn();
const mergeAllWindows = jest.fn();

jest.unstable_mockModule('../src/tabManagement.js', () => ({
  splitTabs,
  mergeAllWindows
}));

const { handleMessage } = await import('../src/service-worker.js');

describe('handleMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls splitTabs for split action', () => {
    handleMessage({ action: 'split' });
    expect(splitTabs).toHaveBeenCalled();
  });

  test('calls mergeAllWindows for merge action', () => {
    handleMessage({ action: 'merge' });
    expect(mergeAllWindows).toHaveBeenCalled();
  });

  test('ignores unknown action', () => {
    handleMessage({ action: 'noop' });
    expect(splitTabs).not.toHaveBeenCalled();
    expect(mergeAllWindows).not.toHaveBeenCalled();
  });
});
