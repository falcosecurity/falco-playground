import { useState } from "react"

import Navbar from "./components/Navbar/Navbar"
import Content from "./components/Content/Content"

import { GlobalStyle, Container } from "./globalStyles.style"

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <GlobalStyle />
      <Container>
        <Navbar />
        <Content />
      </Container>
    </>
  )
}

export default App
