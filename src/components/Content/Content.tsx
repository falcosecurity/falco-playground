import { Section } from "./content.style";
import Monaco from "../Editor/Monaco";
import Sidebar from "../Sidebar/Sidebar";
import { useDebounce } from "../../Hooks/UseDebounce";

import { useEffect, useState } from "react";
import useWasm from "../../Hooks/UseWasm";

const Content = () => {
  const [code, setCode] = useState<string>("");
  const [example, setExample] = useState<string>();
  const debouncedCode = useDebounce(code, 500);
  const [err, setErr] = useState("");

  const [wasm] = useWasm();

  useEffect(() => {
    const autoSave = async () => {
      try {
        const [out, err] = await wasm.writeFile("rule.yaml", code);
        setErr("");
      } catch (err) {
        setErr(err);
      }
    };
    autoSave();
  }, [debouncedCode]);
  return (
    <Section>
      <Monaco data={setCode} example={example} />
      <Sidebar code={code} example={setExample} />
    </Section>
  );
};

export default Content;
