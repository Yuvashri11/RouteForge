import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { queryClient } from "./lib/query";
import { router } from "./router";

import { ElysiaClientContextProvider } from "./lib/api/context";
import { api } from "./lib/api/treaty";
import { SSEProvider } from "./components/SSEProvider";

export function App() {
  return (
    <ThemeProvider>
      <ElysiaClientContextProvider value={api}>
        <QueryClientProvider client={queryClient}>
          <SSEProvider>
            <RouterProvider router={router} />
          </SSEProvider>
        </QueryClientProvider>
      </ElysiaClientContextProvider>
    </ThemeProvider>
  );
}

export default App;
