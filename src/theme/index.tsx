import React, { createContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { ThemePreference } from "../domain/models";

const darkColors = {
  bg: "#09090F",
  bgElevated: "#0E0E16",
  bgCard: "#16161F",
  border: "#252530",
  borderSubtle: "#1A1A25",
  textPrimary: "#F0F0F5",
  textSecondary: "#A2A2B4",
  textTertiary: "#68687A",
  accent: "#7B6EF6",
  accentSubtle: "rgba(123,110,246,0.12)",
  accentGlow: "rgba(123,110,246,0.25)",
  success: "#4ECBA0",
  successSubtle: "rgba(78,203,160,0.1)",
  warning: "#E8A838",
  warningSubtle: "rgba(232,168,56,0.1)",
  danger: "#E85858",
  dangerSubtle: "rgba(232,88,88,0.1)",
};

const lightColors: ThemeColors = {
  bg: "#F4F5F8",
  bgElevated: "#FFFFFF",
  bgCard: "#FFFFFF",
  border: "rgba(28,28,30,0.1)",
  borderSubtle: "rgba(28,28,30,0.06)",
  textPrimary: "#17171B",
  textSecondary: "#5F6270",
  textTertiary: "#A1A4B0",
  accent: "#635BFF",
  accentSubtle: "rgba(99,91,255,0.1)",
  accentGlow: "rgba(99,91,255,0.18)",
  success: "#22A86F",
  successSubtle: "rgba(34,168,111,0.1)",
  warning: "#C97804",
  warningSubtle: "rgba(201,120,4,0.1)",
  danger: "#D9342B",
  dangerSubtle: "rgba(217,52,43,0.1)",
};

export type ThemeColors = typeof darkColors;
export type ThemeMode = "light" | "dark";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export function createTypography(colors: ThemeColors) {
  return {
    displayLarge: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.8, color: colors.textPrimary },
    displayMedium: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.6, color: colors.textPrimary },
    titleLarge: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.3, color: colors.textPrimary },
    titleMedium: { fontSize: 16, fontWeight: "700" as const, letterSpacing: -0.2, color: colors.textPrimary },
    titleSmall: { fontSize: 14, fontWeight: "600" as const, letterSpacing: -0.1, color: colors.textPrimary },
    bodyMedium: { fontSize: 13, fontWeight: "400" as const, color: colors.textSecondary },
    bodySmall: { fontSize: 12, fontWeight: "400" as const, color: colors.textSecondary },
    label: {
      fontSize: 11,
      fontWeight: "500" as const,
      letterSpacing: 0.8,
      textTransform: "uppercase" as const,
      color: colors.textTertiary,
    },
    micro: { fontSize: 10, fontWeight: "500" as const, letterSpacing: 0.4, color: colors.textTertiary },
  };
}

interface AppTheme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: ReturnType<typeof createTypography>;
}

const ThemeContext = createContext<AppTheme | undefined>(undefined);

export function AppThemeProvider({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: React.ReactNode;
}) {
  const systemMode = useColorScheme();
  const mode: ThemeMode = preference === "system" ? (systemMode === "light" ? "light" : "dark") : preference;

  const value = useMemo<AppTheme>(() => {
    const selectedColors = mode === "dark" ? darkColors : lightColors;
    return {
      mode,
      colors: selectedColors,
      spacing,
      radius,
      typography: createTypography(selectedColors),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme must be used inside AppThemeProvider");
  return context;
}

export const colors = darkColors;
export const typography = createTypography(darkColors);
