import { useState, useRef, useEffect } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import Editor from "./monaco.style";

const Monaco = () => {
  const monacoEL = useRef(null);
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [value, setValue] = useState<string>("");
  useEffect(() => {
    if (monacoEL) {
      setEditor((editor) => {
        if (editor) return editor;

        return monaco.editor.create(monacoEL.current!, {
          value: "",
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
      editor.getModel().onDidChangeContent(() => {
        console.log("changed");
      });
    }
  });

  return (
    <Editor
      onChange={() => {
        console.log("changed");
      }}
      ref={monacoEL}
    />
  );
};

export default Monaco;
