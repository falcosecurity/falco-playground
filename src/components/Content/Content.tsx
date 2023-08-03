import { useEffect, useState } from "react";

import { Section } from "./content.style";
import Monaco from "../Editor/Monaco";
import Sidebar from "../Sidebar/Sidebar";
import { useDebounce } from "../../Hooks/UseDebounce";
import useWasm from "../../Hooks/UseWasm";
import type { Error } from "../Sidebar/falco_output";

const Content = () => {
  const [code, setCode] = useState<string>("");
  const [example, setExample] = useState<string>();
  const debouncedCode = useDebounce(code, 800);
  const [falcoJsonErr, setFalcoJsonErr] = useState<Error[]>();
  const [err, setErr] = useState("");

  const [wasm] = useWasm();

  useEffect(() => {
    const autoSave = async () => {
      try {
        await wasm.writeFileAndRun("rule.yaml", code);
        setErr("");
      } catch (err) {
        setErr(err);
      }
    };
    autoSave();
    if (debouncedCode) {
      localStorage.setItem("code", debouncedCode);
    }
  }, [debouncedCode]);
  return (
    <Section>
      <Monaco data={setCode} example={example} falcoJsonErr={falcoJsonErr} />
      <Sidebar
        code={debouncedCode}
        example={setExample}
        errJson={setFalcoJsonErr}
      />
    </Section>
  );
};

export default Content;
