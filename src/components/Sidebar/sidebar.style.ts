import styled from "styled-components";

export const SideDiv = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 25%;
  gap: 1rem;
`;
export const CtaDiv = styled.div`
  //border-bottom: 2.5px solid rgba(5, 5, 5, 0.06);
  flex: 1 1 15%;
`;

export const ErrorDiv = styled.div<{ $error?: boolean }>`
  flex: 1 1 75%;
  background-color: black;
  font-family: "Source Code Pro";
  color: ${(props) => (props.$error ? "#f24c3d" : "#9DC08B")};
  padding: 1rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  white-space: pre-line;
`;
