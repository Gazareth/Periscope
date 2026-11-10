"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";

// Follows the OS light/dark preference via CSS variables (no flash on load).
const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#0d99ff" },
        background: { default: "#f0f0f0", paper: "#ffffff" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#0d99ff" },
        background: { default: "#1e1e1e", paper: "#2c2c2c" },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
