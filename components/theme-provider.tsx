"use client";
import { ThemeProvider } from "next-themes";

type Props = {
  children: React.ReactNode;
};

export function AppThemeProvider({ children }: Props) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      themes={["dark", "bright-yellow"]}
      value={{
        dark: "dark",
        "bright-yellow": "theme-yellow",
      }}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
