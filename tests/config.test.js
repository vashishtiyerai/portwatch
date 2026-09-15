const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { DEFAULT_CONFIG, loadConfig, saveConfig } = require('../packages/core/dist/config.js');

test('Config module provides sensible default configuration', () => {
  assert.equal(DEFAULT_CONFIG.refreshInterval, 2000);
  assert.equal(DEFAULT_CONFIG.theme, 'dark');
  assert.equal(DEFAULT_CONFIG.historyEnabled, true);
  assert.equal(DEFAULT_CONFIG.confirmKill, true);
  assert.equal(DEFAULT_CONFIG.allowForceKill, true);
});

test('loadConfig loads defaults when directory is empty', () => {
  const tempDir = path.join(os.tmpdir(), `portwatch-test-${Date.now()}`);
  try {
    const config = loadConfig(tempDir);
    assert.equal(config.refreshInterval, 2000);
    assert.equal(config.theme, 'dark');
  } finally {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('saveConfig persists overrides and loadConfig reads them back', () => {
  const tempDir = path.join(os.tmpdir(), `portwatch-test-save-${Date.now()}`);
  try {
    const success = saveConfig({ theme: 'light', refreshInterval: 5000 }, tempDir);
    assert.equal(success, true);

    const loaded = loadConfig(tempDir);
    assert.equal(loaded.theme, 'light');
    assert.equal(loaded.refreshInterval, 5000);
    assert.equal(loaded.confirmKill, true); // preserved default
  } finally {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
