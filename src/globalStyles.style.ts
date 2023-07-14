import { createGlobalStyle, styled } from "styled-components"

export const GlobalStyle = createGlobalStyle`
    body{
        font-family: 'Open Sans', sans-serif;
    }
`

export const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  flex-direction: column;
  gap: 3rem;
`
