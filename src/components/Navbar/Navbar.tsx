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
