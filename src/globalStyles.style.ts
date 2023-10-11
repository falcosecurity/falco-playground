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
