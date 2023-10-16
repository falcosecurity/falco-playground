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

import "monaco-editor/esm/vs/editor/editor.all.js";

import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Uri } from "monaco-editor/esm/vs/editor/editor.api";

export { monaco, Uri };
