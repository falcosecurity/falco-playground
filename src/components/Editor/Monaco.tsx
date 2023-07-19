import { useState, useRef, useEffect } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import Editor from "./monaco.style";

const Monaco = () => {
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  const monacoEL = useRef(null);

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

  return <Editor ref={monacoEL} />;
};

export default Monaco;
