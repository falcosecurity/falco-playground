import Navbar from "./components/Navbar/Navbar";
import Content from "./components/Content/Content";
import { HashRouter, Route, Routes } from "react-router-dom";
import { GlobalStyle, Container } from "./globalStyles.style";

const WebPage = () => (
  <>
    <GlobalStyle />
    <Container>
      <Navbar />
      <Content />
    </Container>
  </>
);

function App() {
  return (
    <HashRouter basename="/">
      <Routes>
        <Route path="/" element={<WebPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
