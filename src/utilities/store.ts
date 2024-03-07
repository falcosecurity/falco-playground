import { configureStore } from "@reduxjs/toolkit";
import codeReducer from "./slice";

const store = configureStore({
  reducer: {
    code: codeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
