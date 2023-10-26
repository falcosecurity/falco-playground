import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { example1, example2, example3 } from "../components/Editor/examples";

interface CodeState {
  value: string;
  rewriteCode: boolean;
}

const initialState: CodeState = {
  value: "",
  rewriteCode: false,
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
  },
});

export const { autosave, example } = codeSlice.actions;
export default codeSlice.reducer;
