import { createGlobalStyle, styled } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  html,
  body {
  margin: 0;
  height: 100%;
  font-family: 'Open Sans', sans-serif;
}
`;

export const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  flex-direction: column;
  gap: 2rem;
  .ant-btn-primary {
    background-color: #00aec7;
  }
  .ant-btn-primary:not(:disabled):not(.ant-btn-disabled):hover {
    background-color: #1cbfd3;
  }
  .ant-btn-default:not(:disabled):not(.ant-btn-disabled):hover {
    color: #00aec7;
    border-color: #00aec7;
  }
`;
