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

import falcoLogo from "../../assets/logo.svg";
import "./navbar.css";
import GitHubButton from "react-github-btn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faToggleOn } from "@fortawesome/free-solid-svg-icons/faToggleOn";
import { faToggleOff } from "@fortawesome/free-solid-svg-icons";
import useLocalStorage from "use-local-storage";
import DarkMode from "../DarkMode/DarkMode";

const toggleOn = <FontAwesomeIcon icon={faToggleOn} />;
const toggleOff = <FontAwesomeIcon icon={faToggleOff} />;
const Navbar = () => {

  return (
    <section className="top-nav" >
      <img src={falcoLogo} width="120px"></img>
      <input id="menu-toggle" type="checkbox" />
      <label className="menu-button-container" htmlFor="menu-toggle">
        <div className="menu-button"></div>
      </label>

      <ul className="menu">
        <li>
          <DarkMode />
        </li>
        <li>
          <a href="https://falco.org/docs/">Docs</a>
        </li>
        <li>
          <a href="https://falco.org/blog">Blogs</a>
        </li>
        <li>
          <a href="https://falco.org/community/">Community</a>
        </li>
        <li>
          <a href="https://falco.org/about/">About</a>
        </li>
        <li>
          <GitHubButton
            href="https://github.com/falcosecurity/falco-playground"
            data-size="large"
            data-show-count="true"
            aria-label="Star falcosecurity/falco-playground on GitHub"
          >
            Star
          </GitHubButton>
        </li>
      </ul>
    </section>
  );
};

export default Navbar;
