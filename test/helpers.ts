import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repoRoot = fileURLToPath(new URL('..', import.meta.url));
export const distDir = path.join(repoRoot, 'dist');

/** Creates an empty temporary directory. */
export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lh-pptr-framework-test-'));
}

/**
 * Switches the test process to a temporary working directory. Call it before importing
 * framework modules: the logger creates a `<datetime>.log` file in the working directory
 * and reports are written to `./reports`.
 */
export function chdirToTemp(): string {
  const dir = makeTempDir();
  process.chdir(dir);
  return dir;
}

/**
 * Runs `snippet` (an ES module body) in a fresh Node process, passing `args` on the command
 * line — `settings/testParams` parses `process.argv` when it is first imported, so anything that
 * depends on CLI parameters must run in its own process.
 *
 * Inside the snippet, `fw('settings/configLoader.js')` imports a compiled framework module and
 * `print(value)` reports a JSON-serializable result, which is returned.
 */
export function runIsolated<T>(snippet: string, args: string[] = [], files: Record<string, string> = {}): T {
  const cwd = makeTempDir();
  try {
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(cwd, name), content);
    const prelude =
      `const fw = (rel) => import(${JSON.stringify(pathToFileURL(distDir).href)} + '/' + rel);\n` +
      `const print = (value) => console.log('@@RESULT@@' + JSON.stringify(value));\n`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', prelude + snippet, '--', ...args], { cwd, encoding: 'utf8' });
    const line = result.stdout.split(/\r?\n/).find(l => l.startsWith('@@RESULT@@'));
    if (result.status !== 0 || !line) {
      throw new Error(`Isolated run failed (exit ${result.status}):\n${result.stderr}\n${result.stdout}`);
    }
    return JSON.parse(line.slice('@@RESULT@@'.length)) as T;
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

/** A minimal Lighthouse flow result step for reporter tests. */
export function makeStep(name: string, score: number | null, audits: Record<string, number | undefined>, extra: Record<string, unknown> = {}) {
  return {
    name,
    lhr: {
      gatherMode: 'navigation',
      finalDisplayedUrl: 'https://shop.example.com/cart',
      requestedUrl: 'https://shop.example.com/cart',
      categories: { performance: { score } },
      audits: Object.fromEntries(Object.entries(audits).map(([id, numericValue]) => [id, { id, title: `Title of ${id}`, numericValue }])),
      ...extra,
    },
  };
}
