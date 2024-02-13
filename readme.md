# Falco-Playground

[![Falco Infra Repository](https://github.com/falcosecurity/evolution/blob/main/repos/badges/falco-infra-blue.svg)](https://github.com/falcosecurity/evolution/blob/main/REPOSITORIES.md#infra-scope) [![Sandbox](https://img.shields.io/badge/status-sandbox-red?style=for-the-badge)](https://github.com/falcosecurity/evolution/blob/main/REPOSITORIES.md#sandbox) [![License](https://img.shields.io/github/license/falcosecurity/testing?style=for-the-badge)](./LICENSE)

A simple web application where you can create, edit and validate [falco rules](https://github.com/falcosecurity/rules). This is a quick solution for users wanting to easily check the accuracy of their custom rules. This application is completely client side and doesn't make calls to any backend server. It leverages the power of [WebAssembly](https://webassembly.org/) to test your rules.

## Usage

### Falco-playground is hosted here: https://falcosecurity.github.io/falco-playground

## Contributing

Please refer to the [contributing guide](https://github.com/falcosecurity/.github/blob/main/CONTRIBUTING.md) and the [code of conduct](https://github.com/falcosecurity/evolution/CODE_OF_CONDUCT.md) for more information on how to contribute.

## Development

This application is built using [React](https://react.dev/) as its front-end framework and incorporates [TypeScript](https://www.typescriptlang.org/) for enhanced type-safety. It also uses [Vite](https://vitejs.dev/) as it's build tool.

### Install deps

```
npm install
```

### Acquiring additional required artifacts

Since `falco-playground` uses WebAssembly, it relies on a `.wasm` file (placed statically at `public/falco.wasm`) linked to a `.js` file (placed at `src/Hooks/falco.js`)

Run the following command to get and place the latest artifacts in their respective paths.

```
npm run get-assets
```

### Start development server

```
npm run dev
```

## Testing

`falco-playground` uses [cypress](https://www.cypress.io/) as it's testing tool.

### Using cypress with launchpad

```
npm run cy:open
```

### Using cypress with CLI

```
npm run cy:run
```
