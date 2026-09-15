#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// If running in development without built dist, load ts-node or compiled dist
const distPath = path.join(__dirname, '..', 'dist', 'index.js');

if (fs.existsSync(distPath)) {
  const { runCli } = require(distPath);
  runCli().then(code => process.exit(code)).catch(err => {
    process.stderr.write(`Fatal Error: ${err.message}\n`);
    process.exit(1);
  });
} else {
  // If not yet compiled, provide direct execution using ts-node or runtime fallback
  try {
    require('ts-node/register');
    const { runCli } = require(path.join(__dirname, '..', 'src', 'index.ts'));
    runCli().then(code => process.exit(code)).catch(err => {
      process.stderr.write(`Fatal Error: ${err.message}\n`);
      process.exit(1);
    });
  } catch {
    // If ts-node not installed, transpile or provide bootstrap
    process.stderr.write('PortWatch: Please build the project first by running "npm run build".\n');
    process.exit(1);
  }
}
