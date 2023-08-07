import Navbar from "./components/Navbar/Navbar";
import Content from "./components/Content/Content";

import { GlobalStyle, Container } from "./globalStyles.style";

function App() {
  return (
    <>
      <GlobalStyle />
      <Container>
        <Navbar />
        <Content />
      </Container>
    </>
  );
}

export default App;
