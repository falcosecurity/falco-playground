/// <reference types="emscripten" />

import { useEffect, useState } from "react";
import Module from "./falco.js";

interface EmscriptenModule {
  callMain([]: string[]): string;
}

interface Falco {
  module: EmscriptenModule;
  main(): Promise<string[]>;
}

function useWasm() {
  const [loading, setLoading] = useState<boolean>(false);
  const [wasm, setWasm] = useState<Falco>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchWasm = async () => {
      try {
        let out: string;
        let err: string;
        const module: EmscriptenModule = await Module({
          noInitialRun: true,
          locateFile: function (s: string) {
            return s;
          },
          print: function (text: string) {
            out += "\n" + text;
          },
          printErr: function (text: string) {
            err += "\n" + text;
          },
        });

        const FalcoObj: Falco = {
          module: module,
          main: async () => {
            out = "";
            err = "";
            module.callMain(["--version"]);
            return [out, err];
          },
        };

        setWasm(FalcoObj);
        setError(null);
      } catch (err) {
        setError(err);
      }
      setLoading(false);
    };
    fetchWasm();
  }, []);

  return [wasm, loading, error] as const;
}
export default useWasm;
