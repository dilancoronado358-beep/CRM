// Dynamic theme — applied via CSS vars on :root by theme applier in App.jsx
// T reads from CSS vars at runtime, so ALL components get updated when theme changes.

const cssVar = (v) => `var(--${v})`;

export const T = {
  bg0:        cssVar("bg0"),
  bg1:        cssVar("bg1"),
  bg2:        cssVar("bg2"),
  bg3:        cssVar("bg3"),
  bg4:        cssVar("bg4"),
  border:     cssVar("border"),
  borderHi:   cssVar("borderHi"),
  teal:       cssVar("teal"),
  tealDark:   cssVar("tealDark"),
  tealSoft:   cssVar("tealSoft"),
  tealGlow:   cssVar("tealGlow"),
  white:      cssVar("white"),
  whiteOff:   cssVar("whiteOff"),
  whiteDim:   cssVar("whiteDim"),
  whiteFade:  cssVar("whiteFade"),
  green:      cssVar("green"),
  greenS:     cssVar("greenS"),
  amber:      cssVar("amber"),
  amberS:     cssVar("amberS"),
  red:        cssVar("red"),
  redS:       cssVar("redS"),
  grad:       cssVar("grad"),
};

export const THEMES = {
  dark: {
    id: "dark", label: "Dark Pro", icon: "🌑", preview: ["#0A0E1A","#06B6D4","#10B981"],
    bg0:"#0A0E1A",bg1:"#111827",bg2:"#1A2236",bg3:"#1F2937",bg4:"#374151",
    border:"#1F2937",borderHi:"#2D3748",
    teal:"#06B6D4",tealDark:"#0891B2",tealSoft:"rgba(6,182,212,.10)",tealGlow:"rgba(6,182,212,.05)",
    white:"#F9FAFB",whiteOff:"#E5E7EB",whiteDim:"#9CA3AF",whiteFade:"#6B7280",
    green:"#10B981",greenS:"rgba(16,185,129,.12)",
    amber:"#F59E0B",amberS:"rgba(245,158,11,.12)",
    red:"#EF4444",redS:"rgba(239,68,68,.12)",
    grad:"linear-gradient(135deg,#06B6D4,#3B82F6)",
  },
  light: {
    id: "light", label: "Light", icon: "☀️", preview: ["#F4F7FE","#06B6D4","#10B981"],
    bg0:"#F4F7FE",bg1:"#FFFFFF",bg2:"#F9FAFB",bg3:"#F3F4F6",bg4:"#E5E7EB",
    border:"#E5E7EB",borderHi:"#D1D5DB",
    teal:"#06B6D4",tealDark:"#0891B2",tealSoft:"rgba(6,182,212,.08)",tealGlow:"rgba(6,182,212,.04)",
    white:"#111827",whiteOff:"#374151",whiteDim:"#6B7280",whiteFade:"#9CA3AF",
    green:"#10B981",greenS:"rgba(16,185,129,.12)",
    amber:"#F59E0B",amberS:"rgba(245,158,11,.12)",
    red:"#EF4444",redS:"rgba(239,68,68,.12)",
    grad:"linear-gradient(135deg,#06B6D4,#3B82F6)",
  },
  midnight: {
    id: "midnight", label: "Midnight Blue", icon: "🌌", preview: ["#02040F","#38BDF8","#34D399"],
    bg0:"#02040F",bg1:"#070D1A",bg2:"#0C1527",bg3:"#121E34",bg4:"#1B2C4A",
    border:"#162035",borderHi:"#1E3050",
    teal:"#38BDF8",tealDark:"#0EA5E9",tealSoft:"rgba(56,189,248,.10)",tealGlow:"rgba(56,189,248,.05)",
    white:"#E8F0FE",whiteOff:"#C5D5F0",whiteDim:"#7B9FCC",whiteFade:"#4D6F99",
    green:"#34D399",greenS:"rgba(52,211,153,.12)",
    amber:"#FBBF24",amberS:"rgba(251,191,36,.12)",
    red:"#F87171",redS:"rgba(248,113,113,.12)",
    grad:"linear-gradient(135deg,#38BDF8,#818CF8)",
  },
  violet: {
    id: "violet", label: "Violet Dusk", icon: "🟣", preview: ["#0D0321","#A78BFA","#34D399"],
    bg0:"#0D0321",bg1:"#130630",bg2:"#1A0A3E",bg3:"#200E4F",bg4:"#2D1570",
    border:"#1F0E45",borderHi:"#2D1570",
    teal:"#A78BFA",tealDark:"#7C3AED",tealSoft:"rgba(167,139,250,.12)",tealGlow:"rgba(167,139,250,.05)",
    white:"#EDE9FE",whiteOff:"#C4B5FD",whiteDim:"#8B5CF6",whiteFade:"#6D28D9",
    green:"#34D399",greenS:"rgba(52,211,153,.12)",
    amber:"#FBBF24",amberS:"rgba(251,191,36,.12)",
    red:"#F87171",redS:"rgba(248,113,113,.12)",
    grad:"linear-gradient(135deg,#7C3AED,#EC4899)",
  },
  emerald: {
    id: "emerald", label: "Emerald", icon: "💚", preview: ["#022C22","#34D399","#60A5FA"],
    bg0:"#022C22",bg1:"#064E3B",bg2:"#065F46",bg3:"#047857",bg4:"#059669",
    border:"#065F46",borderHi:"#047857",
    teal:"#34D399",tealDark:"#10B981",tealSoft:"rgba(52,211,153,.12)",tealGlow:"rgba(52,211,153,.06)",
    white:"#ECFDF5",whiteOff:"#D1FAE5",whiteDim:"#6EE7B7",whiteFade:"#34D399",
    green:"#60A5FA",greenS:"rgba(96,165,250,.12)",
    amber:"#FBBF24",amberS:"rgba(251,191,36,.12)",
    red:"#F87171",redS:"rgba(248,113,113,.12)",
    grad:"linear-gradient(135deg,#34D399,#60A5FA)",
  },
};

export function applyTheme(themeId) {
  const th = THEMES[themeId] || THEMES.dark;
  const root = document.documentElement;
  const keys = ["bg0","bg1","bg2","bg3","bg4","border","borderHi","teal","tealDark","tealSoft","tealGlow","white","whiteOff","whiteDim","whiteFade","green","greenS","amber","amberS","red","redS","grad"];
  keys.forEach(k => root.style.setProperty(`--${k}`, th[k]));
}
