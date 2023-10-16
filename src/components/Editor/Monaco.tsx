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

import React, { useState, useRef, useEffect } from "react";
import { setDiagnosticsOptions } from "monaco-yaml";
import { JSONSchema6 } from "json-schema";
import * as lzstring from "lz-string";

import Editor from "./monaco.style";
import { example1, example2, example3 } from "./examples";
import { monaco, Uri } from "./customMocaco";
import type { CustomError, Error } from "../Sidebar/falco_output";
import falcoSchema from "./falcoSchema.json";
import { useSearchParams } from "react-router-dom";
import { message } from "antd";

interface monacoProps {
  data?: React.Dispatch<React.SetStateAction<string>>;
  example?: string;
  falcoJsonErr?: Error[];
  uploadCode?: string;
  setUploadCode?: React.Dispatch<React.SetStateAction<string>>;
}

export const decodedYaml = (encodedData: string) => {
  return lzstring.decompressFromBase64(encodedData);
};

const messageInterval = 5;

const Monaco = ({
  data,
  example,
  falcoJsonErr,
  uploadCode,
  setUploadCode,
}: monacoProps) => {
  const monacoEL = useRef(null);
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [searchParams] = useSearchParams();

  const baseURL = `${window.location.protocol}//${window.location.host}`;
  const modelUri = Uri.parse(`${baseURL}/falcoSchema.json`);
  let model: monaco.editor.ITextModel;

  const originalURL = window.location.origin + window.location.pathname;

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
        const localCode = localStorage.getItem("code");
        const shared = localStorage.getItem("isShared");
        const query = searchParams.get("code");
        if (query) {
          const decodedYamlCode = decodedYaml(query);
          if (decodedYamlCode) {
            localStorage.setItem("isShared", "true");
            localStorage.setItem("code", decodedYamlCode);
            window.location.replace(originalURL);
          } else {
            message.error(
              "Error loading shared code. URL incorrrect or tampered with"
            );
            setInterval(() => {
              window.location.replace(originalURL);
            }, 3000);
          }
        } else if (localCode) {
          if (shared == "true") {
            message.success("Loading shared code", messageInterval);
            localStorage.setItem("isShared", "false");
          } else if (shared != "true") {
            message.success("Loading from local storage", messageInterval);
          }

          model = monaco.editor.createModel(localCode, "yaml", modelUri);
          data(() => {
            return localCode;
          });
        } else {
          message.success("Loading example", messageInterval);
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
      const postition = editor.getModel().getPositionAt(err.position.offset);
      Markerdata.push({
        code: err.code,
        startColumn: postition.column,
        startLineNumber: postition.lineNumber,
        severity: monaco.MarkerSeverity.Error,
        message: err.message,
        endLineNumber: postition.lineNumber,
        endColumn: postition.column,
      });
    });
    monaco?.editor.setModelMarkers(editor?.getModel(), "owner", Markerdata);
  }, [falcoJsonErr === undefined ? undefined : Object.values(falcoJsonErr)]);

  editor?.getModel().onDidChangeContent(() => {
    data(() => {
      return editor.getModel().getValue();
    });
  });
  return <Editor className="monaco" ref={monacoEL} />;
};

export default Monaco;
