const test = require('node:test');
const assert = require('node:assert/strict');
const { filterPorts, sortPorts } = require('../packages/core/dist/filter.js');

const samplePorts = [
  { port: 3000, protocol: 'tcp', pid: 101, processName: 'node', localAddress: '127.0.0.1', state: 'LISTENING', project: { name: 'web-app', type: 'nodejs' } },
  { port: 5173, protocol: 'tcp', pid: 102, processName: 'vite', localAddress: '0.0.0.0', state: 'LISTENING', project: { name: 'frontend', framework: 'Vite', type: 'nodejs' } },
  { port: 8000, protocol: 'tcp', pid: 103, processName: 'python', localAddress: '127.0.0.1', state: 'ESTABLISHED' },
  { port: 5353, protocol: 'udp', pid: 104, processName: 'mDNSResponder', localAddress: '0.0.0.0', state: 'LISTENING' },
  { port: 8080, protocol: 'tcp', pid: 105, processName: 'nginx', localAddress: '192.168.1.10', state: 'LISTENING' },
];

test('filterPorts filters by protocol', () => {
  const udpOnly = filterPorts(samplePorts, { protocol: 'udp' });
  assert.equal(udpOnly.length, 1);
  assert.equal(udpOnly[0].port, 5353);

  const tcpOnly = filterPorts(samplePorts, { protocol: 'tcp' });
  assert.equal(tcpOnly.length, 4);
});

test('filterPorts filters by socket state', () => {
  const established = filterPorts(samplePorts, { state: 'ESTABLISHED' });
  assert.equal(established.length, 1);
  assert.equal(established[0].port, 8000);
});

test('filterPorts filters by port range', () => {
  const range = filterPorts(samplePorts, { portRange: { min: 3000, max: 5200 } });
  assert.equal(range.length, 2);
  assert.ok(range.some(p => p.port === 3000));
  assert.ok(range.some(p => p.port === 5173));
});

test('filterPorts filters by localhost only', () => {
  const local = filterPorts(samplePorts, { localhostOnly: true });
  // 127.0.0.1 and 0.0.0.0 are local addresses
  assert.ok(local.every(p => p.localAddress === '127.0.0.1' || p.localAddress === '0.0.0.0'));
  assert.ok(!local.some(p => p.localAddress === '192.168.1.10'));
});

test('filterPorts searches across port, process, PID, and project name', () => {
  assert.equal(filterPorts(samplePorts, { query: '3000' }).length, 1);
  assert.equal(filterPorts(samplePorts, { query: 'vite' }).length, 1);
  assert.equal(filterPorts(samplePorts, { query: '103' }).length, 1);
  assert.equal(filterPorts(samplePorts, { query: 'frontend' }).length, 1);
});

test('sortPorts sorts correctly ascending and descending', () => {
  const sortedAsc = sortPorts(samplePorts, 'port', true);
  assert.equal(sortedAsc[0].port, 3000);
  assert.equal(sortedAsc[sortedAsc.length - 1].port, 8080);

  const sortedDesc = sortPorts(samplePorts, 'port', false);
  assert.equal(sortedDesc[0].port, 8080);
  assert.equal(sortedDesc[sortedDesc.length - 1].port, 3000);
});
