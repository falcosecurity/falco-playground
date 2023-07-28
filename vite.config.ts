import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import monacoEditorPlugin, {
  IMonacoEditorOpts,
} from "vite-plugin-monaco-editor";

// https://vitejs.dev/config/

const option: IMonacoEditorOpts = {
  languageWorkers: [],
  customWorkers: [{ label: "yaml", entry: "monaco-yaml/yaml.worker.js" }],
};
export default defineConfig({
  plugins: [monacoEditorPlugin.default(option), react()],
});
