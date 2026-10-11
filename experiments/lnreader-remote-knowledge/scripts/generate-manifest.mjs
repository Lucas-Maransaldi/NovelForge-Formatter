import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const knowledgePath = 'braham.json';
const bytes = await readFile(resolve(ROOT, 'fixtures', knowledgePath));
const document = JSON.parse(bytes.toString('utf8'));
if (document.schema !== 'nf-knowledge-poc-v1' || document.bookId !== 'nf-overgeared-poc') {
  throw new Error('Knowledge fixture schema/bookId is not the expected synthetic POC document.');
}

const manifest = {
  schema: 'nf-knowledge-manifest-poc-v1',
  bookId: document.bookId,
  revision: 'fixture-r1',
  knowledgePath,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  byteLength: bytes.length,
};
await writeFile(resolve(ROOT, 'fixtures', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`Generated deterministic manifest for ${knowledgePath} (${bytes.length} bytes).\n`);
