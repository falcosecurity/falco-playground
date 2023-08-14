import Navbar from "./components/Navbar/Navbar";
import Content from "./components/Content/Content";
import { RouterProvider, redirect, createHashRouter } from "react-router-dom";
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
  const router = createHashRouter([
    {
      path: "/",
      Component: WebPage,
    },
  ]);
  return <RouterProvider router={router} />;
}

export default App;
