import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import monacoEditorPlugin, {
  IMonacoEditorOpts,
} from "vite-plugin-monaco-editor";

// https://vitejs.dev/config/

const options: IMonacoEditorOpts = {
  customWorkers: [{label:"yaml",entry:"monaco-yaml/yaml.worker.js"}],
  languageWorkers: ["editorWorkerService"]
};
export default defineConfig({
  plugins: [monacoEditorPlugin.default(options), react()],
});
