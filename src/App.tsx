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
