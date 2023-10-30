import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { example1, example2, example3 } from "../data/examples";
import { FalcoStdOut, Error } from "../components/Sidebar/falco_output";

interface CodeState {
  value: string;
  rewriteCode: boolean;
  output: string;
  errorJson: FalcoStdOut;
}

const initialState: CodeState = {
  value: "",
  rewriteCode: false,
  output: "",
  errorJson: {} as FalcoStdOut,
};

export const codeSlice = createSlice({
  name: "code",
  initialState,
  reducers: {
    autosave: (state, action: PayloadAction<string>) => {
      state.value = action.payload;
      state.rewriteCode = false;
    },
    example: (state, action: PayloadAction<string>) => {
      state.rewriteCode = true;
      switch (action.payload) {
        case "1":
          state.value = example1;
          break;
        case "2":
          state.value = example2;
          break;
        case "3":
          state.value = example3;
          break;
      }
    },
    output: (state, action: PayloadAction<string>) => {
      state.output = action.payload;
    },
    errorJson: (state, action: PayloadAction<FalcoStdOut>) => {
      state.errorJson = action.payload;
    },
    upload: (state, action: PayloadAction<string>) => {
      state.rewriteCode = true;
      state.value = action.payload;
    },
  },
});

export const { autosave, example, output, errorJson, upload } =
  codeSlice.actions;
export default codeSlice.reducer;
