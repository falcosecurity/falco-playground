// SPDX-License-Identifier: Apache-2.0
/*
Copyright (C) 2026 The Falco Authors.

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

import React, { useState, useEffect } from "react";
import { monaco } from "../Editor/customMocaco";

const STORAGE_KEY = "falco-playground-theme";

function getInitialDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    return stored === "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(dark: boolean): void {
  document.body.setAttribute("data-theme", dark ? "dark" : "light");
  monaco.editor.setTheme(dark ? "vs-dark" : "vs-light");
}

const DarkMode = () => {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);

  useEffect(() => {
    applyTheme(isDark);
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const toggler = () => setIsDark((prev) => !prev);

  return (
    <div className="dark_mode">
      <i
        onClick={toggler}
        className={isDark ? "bi bi-brightness-high-fill" : "bi bi-moon-stars-fill"}
        style={{ fontSize: "1em", color: "#00AEC7" }}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        role="button"
      />
    </div>
  );
};

export default DarkMode;
