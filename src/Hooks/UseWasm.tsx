/// <reference types="emscripten" />

import { useEffect, useState } from "react";
import Module from "./falco.js";

interface EmscriptenModule {
  callMain([]): string;
  FS: typeof FS;
}

interface Falco {
  module: EmscriptenModule;
  writeFile(path, string): Promise<string[]>;
  main(): Promise<string[]>;
}

function useWasm() {
  const [loading, setLoading] = useState<boolean>(false);
  const [falco, setFalco] = useState<Falco>();
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
          writeFile: async (path: string, code: string) => {
            out = "";
            err = "";
            module.FS.writeFile(path, code);
            module.callMain([
              "--validate",
              "rule.yaml",
              "-o",
              "json_output=true",
              "-o",
              "log_level=debug",
              "-v",
              "-o",
              "log_stderr=true",
            ]);
            return [out, err];
          },
          main: async () => {
            out = "";
            err = "";
            module.callMain(["--validate", "rule.yaml"]);
            return [out, err];
          },
        };

        setFalco(FalcoObj);
        setError(null);
        setLoading(false);
      } catch (err) {
        setError(err);
      }
    };
    fetchWasm();
  }, []);

  return [falco, loading, error] as const;
}
export default useWasm;
