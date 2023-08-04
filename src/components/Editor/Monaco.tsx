import React, { useState, useRef, useEffect } from "react";
import { setDiagnosticsOptions } from "monaco-yaml";
import falcoSchema from "./falcoSchema.json";
import YamlWorker from "./yaml.worker.js?worker";
import { JSONSchema6 } from "json-schema";

import Editor from "./monaco.style";
import { example1, example2, example3 } from "./examples";
import { monaco, Uri } from "./customMocaco";
import type { CustomError, Error } from "../Sidebar/falco_output";

interface props {
  data: React.Dispatch<React.SetStateAction<string>>;
  example: string;
  falcoJsonErr: Error[];
  uploadCode: string;
  setUploadCode: React.Dispatch<React.SetStateAction<string>>;
}

const Monaco = ({
  data,
  example,
  falcoJsonErr,
  uploadCode,
  setUploadCode,
}: props) => {
  const monacoEL = useRef(null);
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const baseURL = `${window.location.protocol}//${window.location.host}`;
  const modelUri = Uri.parse(`${baseURL}/falcoSchema.json`);
  let model: monaco.editor.ITextModel;
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
        const localCode = localStorage.getItem("code");
        if (localCode) {
          model = monaco.editor.createModel(localCode, "yaml", modelUri);
          data(() => {
            return localCode;
          });
        } else {
          model = monaco.editor.createModel(example1, "yaml", modelUri);
          data(() => {
            return example1;
          });
        }
        return monaco.editor.create(monacoEL.current!, {
          model: model,
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
    if (uploadCode != "") {
      editor?.getModel().setValue(uploadCode);
    }
    setUploadCode(() => {
      return "";
    });
  }, [uploadCode]);

  const handleSquigglyLines = (): CustomError[] => {
    const errArr: CustomError[] = [];
    falcoJsonErr?.forEach((err) => {
      err.context.locations.forEach((location, idx) => {
        if (idx != err.context.locations.length - 1) {
          errArr.push({
            code: err.code,
            message: "Error at " + location.item_type,
            position: location.position,
          });
        } else {
          errArr.push({
            code: err.code,
            message: err.message,
            position: location.position,
          });
        }
      });
    });
    return errArr;
  };

  useEffect(() => {
    const squigglyErr = handleSquigglyLines();
    const Markerdata: monaco.editor.IMarkerData[] = [];
    squigglyErr?.map((err) => {
      Markerdata.push({
        code: err.code,
        startColumn: err.position.column + 1,
        startLineNumber: err.position.line + 1,
        severity: monaco.MarkerSeverity.Error,
        message: err.message,
        endLineNumber: err.position.line + 1,
        endColumn: err.position.column + 1,
      });
    });
    monaco?.editor.setModelMarkers(editor?.getModel(), "owner", Markerdata);
  }, [falcoJsonErr?.length]);

  editor?.getModel().onDidChangeContent(() => {
    data(() => {
      return editor.getModel().getValue();
    });
  });
  return <Editor ref={monacoEL} />;
};

export default Monaco;
