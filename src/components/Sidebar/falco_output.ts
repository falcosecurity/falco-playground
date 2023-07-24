export interface FalcoStdOut {
  falco_load_results: FalcoLoadResult[];
}

export interface FalcoLoadResult {
  errors: Error[];
  name: string;
  successful: boolean;
  warnings: any[];
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
