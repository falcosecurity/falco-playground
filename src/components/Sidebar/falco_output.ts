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

export interface FalcoStdOut {
  falco_load_results: FalcoLoadResult[];
}

export interface FalcoLoadResult {
  errors: Error[];
  name: string;
  successful: boolean;
  warnings: string[];
}

export interface Error {
  code: string;
  codedesc: string;
  context: Context;
  message: string;
}

export interface Context {
  locations: Location[];
  snippet: string;
}

export interface Location {
  item_name: string;
  item_type: string;
  position: Position;
}

export interface Position {
  column: number;
  line: number;
  name: string;
  offset: number;
}

export interface CustomError {
  position: Position;
  message: string;
  code: string;
}
