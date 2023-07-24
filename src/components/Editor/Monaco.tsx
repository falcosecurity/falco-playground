import React, { useState, useRef, useEffect, Dispatch } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import Editor from "./monaco.style";
import { example1, example2, example3 } from "./examples";

interface props {
  data: React.Dispatch<React.SetStateAction<string>>;
  example: string;
}

const Monaco = ({ data, example }: props) => {
  const monacoEL = useRef(null);
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  useEffect(() => {
    if (monacoEL) {
      setEditor((editor) => {
        if (editor) return editor;

        return monaco.editor.create(monacoEL.current!, {
          value: example1,
          language: "yaml",
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
