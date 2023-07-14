import { Nav, NavItems, NavList } from "./navbar.style"
import falcoLogo from "../../assets/logo.svg"

const Navbar = () => {
  return (
    <>
      <Nav>
        <img src={falcoLogo} width="120px" />
        <NavList>
          <NavItems>Docs</NavItems>
          <NavItems>Blog</NavItems>
          <NavItems>Community</NavItems>
          <NavItems>About</NavItems>
        </NavList>
      </Nav>
    </>
  )
}

export default Navbar
