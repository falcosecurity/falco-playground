/// <reference types="emscripten" />

import { useEffect, useState } from "react";
import Module from "./falco.js";

interface EmscriptenModule {
  callMain([]): string;
  FS: typeof FS;
}

interface Falco {
  module: EmscriptenModule;
  compileWithScap(file: Uint8Array, code: string): Promise<string[]>;
  writeFileAndRun(path: string, code: string): Promise<string[]>;
  run(): Promise<string[]>;
}

function useWasm() {
  const [loading, setLoading] = useState<boolean>(false);
  const [falco, setFalco] = useState<Falco>();
  const [error, setError] = useState<string>();
  const falcoOptions = [
    "--validate",
    "rule.yaml",
    "-o",
    "json_output=true",
    "-o",
    "log_level=debug",
    "-v",
    "-o",
    "log_stderr=true",
  ];
  const falcoScapOptions = [
    "-r",
    "rule.yaml",
    "-e",
    "capture_file.scap",
    "-o",
    "json_output=true",
    "-o",
    "log_level=debug",
    "-v",
    "-o",
    "log_stderr=true",
    "-o",
    "stdout_output.enabled=true",
  ];

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchWasm = async () => {
      try {
        let out: string;
        let err: string;
        const module: EmscriptenModule = await Module({
          noInitialRun: true,
          thisProgram: "falco",
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
          writeFileAndRun: async (path: string, code: string) => {
            out = "";
            err = "";
            module.FS.writeFile(path, code);
            module.callMain(falcoOptions);
            return [out, err];
          },

          compileWithScap: async (file: Uint8Array, code: string) => {
            out = "";
            err = "";
            module.FS.writeFile("capture_file.scap", file);
            module.FS.writeFile("rule.yaml", code);
            module.callMain(falcoScapOptions);
            return [out, err];
          },
          run: async () => {
            out = "";
            err = "";
            module.callMain(falcoOptions);
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
