// SPDX-License-Identifier: Apache-2.0
/*
Copyright (C) 2023 The Falco Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

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
export const Button = styled.div`
  flex: 1 1 3%;
  color:var(--color)
`;
export const SpinDiv = styled(Spin)`
  flex: 1 1 50%;
`;
export const ErrorDiv = styled.div<{ $error?: boolean }>`
  flex: 1 1 60%;
  background-color: var(--color);
  font-family: "Source Code Pro";
  color: ${(props) => (props.$error ? "#f24c3d" : "#9DC08B")};
padding: 1rem;
border - radius: 1rem;
font - size: 0.8rem;
white - space: pre - line;
overflow - x: scroll;
`;
