/// <reference types="emscripten" />

import { useEffect, useState } from "react";
import Module from "./falco.js";

interface EmscriptenModule {
  [x: string]: any;
  callMain([]: string[]): string;
}

interface Falco {
  module: EmscriptenModule;
  main(file?: string): Promise<string[]>;
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
          main: async (file) => {
            out = "";
            err = "";
            module.callMain(["--help"]);
            return [out, err];
          },
        };

        setFalco(FalcoObj);
        setError(null);
      } catch (err) {
        setError(err);
      }
      setLoading(false);
    };
    fetchWasm();
  }, []);

  return [falco, loading, error] as const;
}
export default useWasm;
