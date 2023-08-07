import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import monacoEditorPlugin, {
  IMonacoEditorOpts,
} from "vite-plugin-monaco-editor";

// https://vitejs.dev/config/

const option: IMonacoEditorOpts = {
  languageWorkers: [],
};
export default defineConfig({
  plugins: [monacoEditorPlugin.default(option), react()],
});
