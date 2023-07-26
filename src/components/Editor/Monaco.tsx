import React, { useState, useRef, useEffect } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { setDiagnosticsOptions } from "monaco-yaml";
import falcoSchema from "./falcoSchema.json";
import YamlWorker from "./yaml.worker.js?worker";
import { JSONSchema6 } from "json-schema";

import Editor from "./monaco.style";
import { example1, example2, example3 } from "./examples";
import { Uri } from "monaco-editor";

interface props {
  data: React.Dispatch<React.SetStateAction<string>>;
  example: string;
}

const Monaco = ({ data, example }: props) => {
  const monacoEL = useRef(null);
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const baseURL = `${window.location.protocol}//${window.location.host}`;
  const modelUri = Uri.parse(`${baseURL}/falcoSchema.json`);
  useEffect(() => {
    if (monacoEL) {
      setEditor((editor) => {
        if (editor) return editor;
        setDiagnosticsOptions({
          enableSchemaRequest: true,
          hover: true,
          completion: true,
          validate: true,
          format: true,
          schemas: [
            {
              schema: falcoSchema as JSONSchema6,
              uri: `${baseURL}/falcoSchema.json`,
              fileMatch: ["falcoSchema.yaml"],
            },
          ],
        });
        window.MonacoEnvironment = {
          getWorker() {
            return new YamlWorker();
          },
        };
        return monaco.editor.create(monacoEL.current!, {
          model: monaco.editor.createModel(example1, "yaml", modelUri),
          automaticLayout: true,
          padding: {
            top: 20,
          },
        });
      });
    }
    return () => editor?.dispose();
  }, [monacoEL.current]);

  useEffect(() => {
    if (editor) {
      switch (example) {
        case "1":
          editor.getModel().setValue(example1);
          break;
        case "2":
          editor.getModel().setValue(example2);
          break;
        case "3":
          editor.getModel().setValue(example3);
      }
    }
  }, [example]);

  useEffect(() => {
    if (editor) {
      editor.getModel().onDidChangeContent(() => {
        data(() => {
          return editor.getModel().getValue();
        });
      });
    }
  });

  return <Editor ref={monacoEL} />;
};

export default Monaco;
