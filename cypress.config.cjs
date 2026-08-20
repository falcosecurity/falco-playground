// SPDX-License-Identifier: Apache-2.0
/*
Copyright (C) 2023 The Falco Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

// This file is intentionally CommonJS (.cjs) rather than TypeScript.
//
// Cypress loads its config file with require() from a CJS context. Since Node
// 20.19 / 22.12, require() understands ESM natively, so the CJS loader sees the
// import/export syntax in a .ts config, treats it as ESM source text and
// compiles it as plain JavaScript. ts-node's require hook never runs, the type
// annotations survive into the parser, and the load fails with
// "SyntaxError: Missing initializer in const declaration".
//
// Newer Node (>= 23.6) strips types on its own and hides the problem again, so
// the breakage only shows up on a middle band of versions - which is exactly
// where the CI runners sit.
//
// .cjs sidesteps all of it: it is unambiguously CommonJS on every Node, needs
// no transpilation, and unlike .mjs/.js it still loads on Node 18, which
// deploy.yaml and release.yaml pin.

const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents(on, config) {
      on("task", {
        // Clipboard test plugin.
        // clipboardy v3 is ESM-only, so it cannot be require()d from here.
        getClipboard: async () => {
          const { default: clipboardy } = await import("clipboardy");
          return clipboardy.readSync();
        },
      });
      // implement node event listeners here
    },
  },
});
