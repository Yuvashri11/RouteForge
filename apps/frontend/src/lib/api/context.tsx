import { createContext, useContext } from "react";
import { api } from "./treaty";

export const ElysiaClientContext = createContext(api);

export const ElysiaClientContextProvider = ElysiaClientContext.Provider;

export const useElysiaClient = () => {
  return useContext(ElysiaClientContext);
};
