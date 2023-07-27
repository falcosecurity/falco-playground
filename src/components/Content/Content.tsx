import { useEffect, useState } from "react";

import { Section } from "./content.style";
import Monaco from "../Editor/Monaco";
import Sidebar from "../Sidebar/Sidebar";
import { useDebounce } from "../../Hooks/UseDebounce";
import useWasm from "../../Hooks/UseWasm";

const Content = () => {
  const [code, setCode] = useState<string>("");
  const [example, setExample] = useState<string>();
  const debouncedCode = useDebounce(code, 800);
  const [err, setErr] = useState("");

  const [wasm] = useWasm();

  useEffect(() => {
    const autoSave = async () => {
      try {
        const [out, err] = await wasm.writeFile("rule.yaml", code);
        console.log("OUT: " + out);
        console.log("ERR: " + err);

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
      <Monaco data={setCode} example={example} />
      <Sidebar code={debouncedCode} example={setExample} />
    </Section>
  );
};

export default Content;
