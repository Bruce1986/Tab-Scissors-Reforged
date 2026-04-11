import fs from 'fs';

const manifestPath = new URL('../src/manifest.json', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

test('service worker is an ES module', () => {
  expect(manifest).toHaveProperty('background.type', 'module');
});

test('extension icons are declared', () => {
  expect(manifest).toHaveProperty('icons.16', 'icons/icon.svg');
  expect(manifest).toHaveProperty('icons.48', 'icons/icon.svg');
  expect(manifest).toHaveProperty('icons.128', 'icons/icon.svg');
});
