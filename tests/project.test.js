const test = require('node:test');
const assert = require('node:assert/strict');
const { identifyProject } = require('../packages/core/dist/project.js');

test('identifyProject detects known services by executable name', () => {
  const pgProcess = {
    pid: 1234,
    name: 'postgres.exe',
    commandLine: 'postgres -D /data',
  };
  const pgResult = identifyProject(pgProcess);
  assert.ok(pgResult);
  assert.equal(pgResult.name, 'PostgreSQL');
  assert.equal(pgResult.framework, 'PostgreSQL');
  assert.equal(pgResult.detectedFrom, 'executable');

  const ollamaProcess = {
    pid: 5678,
    name: 'ollama',
    commandLine: 'ollama serve',
  };
  const ollamaResult = identifyProject(ollamaProcess);
  assert.ok(ollamaResult);
  assert.equal(ollamaResult.name, 'Ollama');
});

test('identifyProject detects dev servers from command line', () => {
  const viteProcess = {
    pid: 9999,
    name: 'node',
    commandLine: 'node node_modules/vite/bin/vite.js',
    workingDirectory: '/Users/test/my-vite-app'
  };
  const viteResult = identifyProject(viteProcess);
  assert.ok(viteResult);
  assert.equal(viteResult.framework, 'Vite');
  assert.equal(viteResult.detectedFrom, 'command_line');

  const uvicornProcess = {
    pid: 8888,
    name: 'python',
    commandLine: 'uvicorn main:app --port 8000',
    workingDirectory: '/Users/test/api'
  };
  const uvicornResult = identifyProject(uvicornProcess);
  assert.ok(uvicornResult);
  assert.equal(uvicornResult.framework, 'FastAPI');
});

test('identifyProject returns null for unknown processes without guessing', () => {
  const unknownProcess = {
    pid: 4321,
    name: 'svchost.exe',
    commandLine: 'C:\\Windows\\system32\\svchost.exe -k LocalServiceNetworkRestricted',
  };
  const result = identifyProject(unknownProcess);
  assert.equal(result, null);
});
