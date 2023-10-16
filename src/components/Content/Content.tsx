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

import { useEffect, useState } from "react";
import { useDebounce } from "../../Hooks/UseDebounce";
import useWasm from "../../Hooks/UseWasm";
import type { Error } from "../Sidebar/falco_output";

import { Section } from "./content.style";
import Monaco from "../Editor/Monaco";
import Sidebar from "../Sidebar/Sidebar";

const Content = () => {
  const [code, setCode] = useState<string>("");
  const [example, setExample] = useState<string>();
  const debouncedCode = useDebounce(code, 800);
  const [uploadCode, setUploadCode] = useState<string>();
  const [falcoJsonErr, setFalcoJsonErr] = useState<Error[]>();

  const [wasm] = useWasm();

  useEffect(() => {
    const autoSave = async () => {
      try {
        await wasm?.writeFileAndRun("rule.yaml", code);
      } catch (err) {
        console.log(err);
      }
    };
    autoSave();
    if (debouncedCode) {
      localStorage.setItem("code", debouncedCode);
    }
  }, [debouncedCode]);
  return (
    <Section>
      <Monaco
        data={setCode}
        example={example}
        falcoJsonErr={falcoJsonErr}
        uploadCode={uploadCode}
        setUploadCode={setUploadCode}
      />
      <Sidebar
        code={debouncedCode}
        example={setExample}
        errJson={setFalcoJsonErr}
        uploadCode={setUploadCode}
      />
    </Section>
  );
};

export default Content;
