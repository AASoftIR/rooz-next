// Offline fallback for environments with Node 22+ but no installed TypeScript.
// For release builds, CI runs tsc typechecking and emits web/ using TypeScript.
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = dirname(dirname(fileURLToPath(import.meta.url)));
for (const file of readdirSync(join(base, 'frontend')).filter(name => name.endsWith('.ts'))) {
  const source = readFileSync(join(base, 'frontend', file), 'utf8');
  const output = stripTypeScriptTypes(source, { mode: 'transform' });
  writeFileSync(join(base, 'web', file.replace(/\.ts$/, '.js')), output);
  process.stdout.write(`Generated web/${file.replace(/\.ts$/, '.js')}\n`);
}
