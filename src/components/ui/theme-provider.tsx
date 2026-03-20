"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export function useTheme() {
  // Import the useTheme hook directly from next-themes
  const { useTheme: useNextTheme } = require("next-themes");
  return useNextTheme();
} 