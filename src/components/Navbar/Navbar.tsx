import falcoLogo from "../../assets/logo.svg";
import "./navbar.css";

const Navbar = () => {
  return (
    <section className="top-nav">
      <img src={falcoLogo} width="120px"></img>
      <input id="menu-toggle" type="checkbox" />
      <label className="menu-button-container" htmlFor="menu-toggle">
        <div className="menu-button"></div>
      </label>
      <ul className="menu">
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
          <iframe
            src="https://ghbtns.com/github-btn.html?user=rohith-raju&repo=falco-playground&type=star&count=true"
            frameBorder="0"
            scrolling="0"
            width="75"
            height="20"
            title="GitHub"
          ></iframe>
        </li>
      </ul>
    </section>
  );
};

export default Navbar;
