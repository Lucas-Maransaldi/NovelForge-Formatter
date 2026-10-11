'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'MANIFEST_SHA256.json');
const ignoredDirectories = new Set(['.git', 'node_modules', '.agents', 'prompts']);
const privateFixturePaths = new Set([
  'tests/fixtures/poc-v0.2.1.epub',
  'tests/fixtures/original.html',
  'tests/fixtures/chapter.xhtml',
  'tests/fixtures/context.json',
  'Overgeared_Capitulos_1_a_5_NovelForge.epub',
  'Overgeared_Capitulos_1_a_5_NovelForge_visual.epub',
  'Overgeared_1-5_NovelForge_Reenriquecido.epub'
]);

function listFiles(directory, relative = '') {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!relative && entry.name === path.basename(manifestPath)) continue;
    if (!relative && ignoredDirectories.has(entry.name)) continue;
    const rel = relative ? relative + '/' + entry.name : entry.name;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(full, rel));
    else if (entry.isFile() && !privateFixturePaths.has(rel)) result.push(rel);
  }
  return result.sort();
}

function calculate() {
  const hashes = {};
  for (const file of listFiles(root)) {
    hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  }
  return JSON.stringify(hashes, null, 2) + '\n';
}

const generated = calculate();
if (process.argv.includes('--write')) {
  fs.writeFileSync(manifestPath, generated, 'utf8');
  process.stdout.write('SHA-256 manifest generated.\n');
} else {
  let current;
  try { current = fs.readFileSync(manifestPath, 'utf8'); }
  catch (error) { process.stderr.write('SHA-256 manifest is missing. Run npm run manifest:generate.\n'); process.exitCode = 1; process.exit(); }
  if (current !== generated) {
    process.stderr.write('SHA-256 manifest mismatch. Run npm run manifest:generate after reviewing the changes.\n');
    process.exitCode = 1;
  } else {
    process.stdout.write('SHA-256 manifest verified.\n');
  }
}
