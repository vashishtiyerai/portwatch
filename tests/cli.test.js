const test = require('node:test');
const assert = require('node:assert/strict');
const { formatPortTable } = require('../packages/cli/dist/formatters/table.js');
const { formatPortJson, formatPortCsv } = require('../packages/cli/dist/formatters/json.js');

test('Table formatter formats rows with headers and columns', () => {
  const ports = [
    {
      port: 3000,
      protocol: 'tcp',
      pid: 18342,
      processName: 'node',
      localAddress: '127.0.0.1',
      state: 'LISTENING',
      project: { name: 'my-app', directory: '/test', type: 'nodejs', detectedFrom: 'package_json' }
    }
  ];

  const output = formatPortTable(ports, false);
  assert.ok(output.includes('PORT'));
  assert.ok(output.includes('3000'));
  assert.ok(output.includes('node'));
  assert.ok(output.includes('18342'));
  assert.ok(output.includes('LISTENING'));
  assert.ok(output.includes('my-app'));
});

test('JSON formatter formats valid JSON array', () => {
  const ports = [
    { port: 5173, protocol: 'tcp', pid: 21902, processName: 'vite', localAddress: '127.0.0.1', state: 'LISTENING' }
  ];
  const jsonStr = formatPortJson(ports);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].port, 5173);
});

test('CSV formatter formats CSV rows with quotes', () => {
  const ports = [
    { port: 8000, protocol: 'tcp', pid: 9124, processName: 'python', localAddress: '0.0.0.0', state: 'LISTENING' }
  ];
  const csvStr = formatPortCsv(ports);
  assert.ok(csvStr.includes('port,protocol,pid,process,address,state,project'));
  assert.ok(csvStr.includes('8000,tcp,9124,"python","0.0.0.0",LISTENING'));
});

test('Table formatter produces perfectly aligned columns with and without ANSI colors', () => {
  const { stripAnsi, padVisible } = require('../packages/cli/dist/formatters/table.js');
  
  // Test stripAnsi
  const coloredStr = '\x1b[1m\x1b[36m3000\x1b[0m';
  assert.equal(stripAnsi(coloredStr), '3000');

  // Test padVisible
  const padded = padVisible(coloredStr, 8);
  assert.equal(stripAnsi(padded).length, 8);

  const ports = [
    { port: 80, protocol: 'tcp', pid: 1, processName: 'system', localAddress: '0.0.0.0', state: 'LISTENING' },
    { port: 3000, protocol: 'tcp', pid: 18342, processName: 'node', localAddress: '127.0.0.1', state: 'LISTENING', project: { name: 'my-app', type: 'nodejs' } },
  ];

  const coloredTable = formatPortTable(ports, true);
  const lines = coloredTable.split('\n');
  assert.ok(lines.length >= 4); // header, separator, 2 rows

  // Verify visible lengths
  const headerLen = stripAnsi(lines[0]).length;
  const sepLen = stripAnsi(lines[1]).length;
  assert.equal(headerLen, sepLen);
});

test('Table formatter shows clean empty state when no ports are provided', () => {
  const emptyPlain = formatPortTable([], false);
  assert.equal(emptyPlain, 'No active local listening sockets found.');

  const emptyColored = formatPortTable([], true);
  assert.ok(emptyColored.includes('No active local listening sockets found.'));
});

test('EXIT_CODES constants match the specifications', () => {
  const { EXIT_CODES } = require('../packages/core/dist/types.js');
  assert.equal(EXIT_CODES.SUCCESS, 0);
  assert.equal(EXIT_CODES.GENERAL_ERROR, 1);
  assert.equal(EXIT_CODES.INVALID_ARGUMENTS, 2);
  assert.equal(EXIT_CODES.PORT_NOT_FOUND, 3);
  assert.equal(EXIT_CODES.PERMISSION_DENIED, 4);
  assert.equal(EXIT_CODES.PROCESS_ACTION_FAILED, 5);
});
