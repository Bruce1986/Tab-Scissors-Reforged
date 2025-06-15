import fs from 'fs';

const manifestPath = new URL('../src/manifest.json', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

test('service worker is an ES module', () => {
  expect(manifest.background.type).toBe('module');
});
