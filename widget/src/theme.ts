// Theme-aware class helpers
export const theme = {
  // Containers
  card: (isDark: boolean) =>
    isDark
      ? "bg-slate-950 border-white shadow-sm"
      : "bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 border border-gray-200 shadow-xl",

  cardInner: (isDark: boolean) =>
    isDark
      ? "bg-black/40 border-slate-800/80"
      : "bg-slate-50 border-slate-200",

  surface: (isDark: boolean) =>
    isDark ? "bg-black/60" : "bg-slate-100",

  // Text
  textPrimary: (isDark: boolean) =>
    isDark ? "text-white" : "text-black",

  textSecondary: (isDark: boolean) =>
    isDark ? "text-black" : "text-black",

  buttonShadow: () =>
    'hover:shadow-xl transition-all duration-200 border shadow-md ',

  buttonBorder: (isDark: boolean) =>
    isDark ? "border-white" : "border-gray-200",

  // Icon chips
  iconBg: (isDark: boolean) =>
    isDark ? "bg-sky-500/12" : "bg-sky-100/70",

  // Spinners
  spinner: (isDark: boolean) =>
    isDark ? "border-white" : "border-black",
};

