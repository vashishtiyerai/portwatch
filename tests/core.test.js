const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Test PortHistoryTracker
test('PortHistoryTracker records open and close events correctly', () => {
  const { PortHistoryTracker } = require('../packages/core/dist/history.js');
  const tracker = new PortHistoryTracker(':memory:');
  tracker.clear();

  const initialPorts = [
    { port: 3000, protocol: 'tcp', pid: 100, processName: 'node', localAddress: '127.0.0.1', state: 'LISTENING' }
  ];

  const openedEvents = tracker.updateSnapshot(initialPorts);
  assert.equal(openedEvents.length, 1);
  assert.equal(openedEvents[0].port, 3000);
  assert.equal(openedEvents[0].event, 'opened');

  // No change -> no events
  const secondEvents = tracker.updateSnapshot(initialPorts);
  assert.equal(secondEvents.length, 0);

  // Close port 3000
  const closedEvents = tracker.updateSnapshot([]);
  assert.equal(closedEvents.length, 1);
  assert.equal(closedEvents[0].port, 3000);
  assert.equal(closedEvents[0].event, 'closed');

  const allEvents = tracker.getEvents();
  assert.equal(allEvents.length, 2);
});

// Test FallbackPortProvider
test('FallbackPortProvider instantiates and produces diagnostics', async () => {
  const { FallbackPortProvider } = require('../packages/core/dist/providers/fallback.js');
  const provider = new FallbackPortProvider();
  assert.equal(provider.platformName, 'fallback');

  const diag = await provider.getDiagnostics();
  assert.equal(diag.providerName, 'FallbackPortProvider (portable netstat)');
  assert.ok(Array.isArray(diag.checks));
});
