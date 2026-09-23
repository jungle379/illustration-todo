import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { DatesProvider } from "@mantine/dates";
import { MantineProvider, createTheme } from "@mantine/core";
import { Toaster } from "sonner";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const theme = createTheme({
  primaryColor: "violet",
  defaultRadius: "md",
  fontFamily:
    '"Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <DatesProvider settings={{ locale: "ja", firstDayOfWeek: 1 }}>
        <Toaster position="top-right" richColors />
        <App />
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
