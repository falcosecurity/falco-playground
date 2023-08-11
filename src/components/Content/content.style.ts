import styled from "styled-components";

export const Section = styled.section`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  width: 95%;
  height: 100%;
`;

export const MobileOnlyDiv = styled.div`
  display: none;
  height: 10rem;
  width: 10rem;
  @media (max-width: 780px) {
    display: unset;
  }
`;
