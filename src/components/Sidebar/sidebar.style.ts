import styled from "styled-components";
import { Spin } from "antd";

export const SideDiv = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 25%;
  gap: 1rem;
  max-height: 83vh;
  min-width: 21rem;
`;
export const CtaDiv = styled.div`
  flex: 1 1 3%;
`;

export const SpinDiv = styled(Spin)`
  flex: 1 1 50%;
`;

export const ErrorDiv = styled.div<{ $error?: boolean }>`
  flex: 1 1 60%;
  background-color: black;
  font-family: "Source Code Pro";
  color: ${(props) => (props.$error ? "#f24c3d" : "#9DC08B")};
  padding: 1rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  white-space: pre-line;
  overflow-x: scroll;
`;
