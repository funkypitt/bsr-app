export const colors = {
  primary: "#CA0000",
  primaryDark: "#9A0000",
  accent: "#56AA5E",
  accentDark: "#3D8344",
  orange: "#AB4200",
  background: "#FAFAFA",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#666666",
  textLight: "#999999",
  border: "#E8E8E8",
  white: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  title: { fontSize: 22, fontWeight: "700" as const, color: colors.text },
  subtitle: { fontSize: 16, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  caption: { fontSize: 12, color: colors.textSecondary },
};
