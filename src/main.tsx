import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { DatesProvider } from "@mantine/dates";
import { MantineProvider, createTheme } from "@mantine/core";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const theme = createTheme({
  primaryColor: "violet",
  defaultRadius: "md",
  fontFamily:
    '"Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <QueryClientProvider client={queryClient}>
        <DatesProvider settings={{ locale: "ja", firstDayOfWeek: 1 }}>
          <Toaster position="top-right" richColors />
          <App />
        </DatesProvider>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
