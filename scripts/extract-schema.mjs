/**
 * Extracts the canonical Falco rule JSON schema from the Emscripten wasm
 * artifact by running `falco --rule-schema` and writing the result verbatim
 * to src/components/Editor/falcoSchema.json.
 *
 * This eliminates schema drift: every time the wasm is updated the schema
 * is regenerated automatically, so hand-edits are never needed again.
 *
 * Prerequisites:
 *   public/falco.wasm and src/Hooks/falco.js must be in place.
 *   Run "npm run get-assets" (or the CI extraction step) first.
 *
 * Usage:
 *   node scripts/extract-schema.mjs
 */

import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);

const FALCO_JS   = resolve(__dirname, '../src/Hooks/falco.js');
const FALCO_WASM = resolve(__dirname, '../public/falco.wasm');
const SCHEMA_OUT = resolve(__dirname, '../src/components/Editor/falcoSchema.json');

const TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------

function checkPrerequisites() {
  for (const p of [FALCO_JS, FALCO_WASM]) {
    if (!existsSync(p)) {
      throw new Error(
        `Required asset not found: ${p}\n` +
        'Run "npm run get-assets" (or the CI wasm extraction step) before ' +
        'running extract-schema.'
      );
    }
  }
}

async function loadCreateModule() {
  // falco.js is real ESM (`import.meta.url` at the top, `export default` at the
  // bottom) and this package is "type": "module", so it always lands in the ESM
  // loader no matter how it is referenced. `require()` on it therefore relies on
  // require(esm), which only exists in Node >= 20.19 / >= 22.12: on Node 18 it
  // throws ERR_REQUIRE_ESM. `import()` loads it on every supported Node.
  //
  // The factory body reads `__dirname` and `require()` as free identifiers in
  // its Node branch, and those do not resolve in ESM scope. Polyfill them on
  // globalThis before the module is evaluated.
  globalThis.__dirname = dirname(FALCO_JS);
  globalThis.require   = require;

  const mod = await import(pathToFileURL(FALCO_JS).href);
  const factory = mod.default ?? mod;

  if (typeof factory !== 'function') {
    throw new Error(
      `falco.js did not export a factory function.\n` +
      `Got: ${typeof factory}\n` +
      'The Emscripten build may use an unexpected export format.'
    );
  }

  return factory;
}

async function runRuleSchema(createModule) {
  let stdout    = '';
  let exitCode  = 0;
  let moduleRef = null;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`falco --rule-schema timed out after ${TIMEOUT_MS / 1000}s`)),
      TIMEOUT_MS
    );

    createModule({
      arguments: ['--rule-schema'],

      // Pass the wasm bytes directly. In Node 18+ `fetch()` is global, so
      // Emscripten's `instantiateAsync` would call `fetch(wasmBinaryFile)` even
      // in Node and fail because a filesystem path is not a valid URL.
      wasmBinary: readFileSync(FALCO_WASM),

      // falco writes the JSON schema to stdout.
      print(line) {
        stdout += line + '\n';
      },

      // Suppress stderr; Falco emits informational start-up messages there.
      printErr() {},

      // Intercept exit so Emscripten does not terminate this process.
      quit(code) {
        exitCode = code;
        clearTimeout(timer);
      },

      onExit(code) {
        exitCode = code;
        clearTimeout(timer);
      },
    }).then((m) => {
      moduleRef = m;
      clearTimeout(timer);
      resolve();
    }).catch((err) => {
      clearTimeout(timer);
      // Emscripten throws { name: 'ExitStatus', status: N } on process.exit().
      if (err?.name === 'ExitStatus') {
        exitCode = err.status;
        resolve();
      } else {
        reject(err);
      }
    });
  });

  // falco's --rule-schema uses `printf("%s", ...)` with no trailing newline,
  // so Emscripten's TTY layer buffers the final `}` and drops it at exit.
  // Pull it out of the stdout stream before we hand the output to JSON.parse.
  // Ref: https://github.com/falcosecurity/falco/blob/master/userspace/falco/app/actions/print_rule_schema.cpp#L27
  if (moduleRef) {
    const stream = moduleRef.FS?.streams?.[1];
    if (stream?.tty?.output?.length > 0) {
      stdout += String.fromCharCode(...stream.tty.output);
    }
  }

  return { stdout: stdout.trim(), exitCode };
}

// ---------------------------------------------------------------------------

async function main() {
  checkPrerequisites();

  console.log('Loading falco.js module …');
  const createModule = await loadCreateModule();

  console.log('Running falco --rule-schema …');
  const { stdout, exitCode } = await runRuleSchema(createModule);

  if (!stdout) {
    throw new Error(
      `falco --rule-schema produced no output (exit ${exitCode}).\n` +
      'Ensure the wasm artifact is built with --rule-schema support ' +
      '(available since Falco 0.37).'
    );
  }

  let schema;
  try {
    schema = JSON.parse(stdout);
  } catch (err) {
    throw new Error(
      `falco --rule-schema output is not valid JSON: ${err.message}\n` +
      `First 300 chars: ${stdout.slice(0, 300)}`
    );
  }

  writeFileSync(SCHEMA_OUT, JSON.stringify(schema, null, 2) + '\n', 'utf8');
  console.log(`✓  Schema written to ${SCHEMA_OUT}`);
}

main().catch((err) => {
  console.error(`extract-schema failed: ${err.message}`);
  process.exit(1);
});
