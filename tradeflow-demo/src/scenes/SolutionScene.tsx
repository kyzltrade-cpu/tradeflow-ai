import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const stats = [
  { value: "< 3s", label: "Avg reply time" },
  { value: "24/7", label: "Always on" },
  { value: "3", label: "Languages" },
];

const steps = [
  { icon: "💬", text: "Customer messages WhatsApp / WeChat" },
  { icon: "🧠", text: "AI reads your catalog & knowledge base" },
  { icon: "⚡", text: "Instant reply with pricing, MOQ, specs" },
];

export const SolutionScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Label entrance
  const labelOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Headline entrance
  const headlineOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [5, 20], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FAF9F6",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        gap: 48,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#0A6E5C",
          textTransform: "uppercase",
          letterSpacing: "3px",
          opacity: labelOpacity,
        }}
      >
        The Solution
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          color: "#111",
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "-2px",
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        TradeFlow replies in{" "}
        <span style={{ color: "#0A6E5C" }}>under 3 seconds</span>.
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 40, marginTop: 8 }}>
        {stats.map((stat, i) => {
          const statScale = spring({
            frame,
            fps,
            delay: 25 + i * 12,
            config: { damping: 12, stiffness: 120 },
          });
          return (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: `scale(${statScale})`,
              }}
            >
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: "#0A6E5C",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "#626260",
                  marginTop: 8,
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works steps */}
      <div
        style={{
          display: "flex",
          gap: 32,
          marginTop: 24,
        }}
      >
        {steps.map((step, i) => {
          const stepOpacity = interpolate(
            frame,
            [65 + i * 12, 77 + i * 12],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const stepY = interpolate(
            frame,
            [65 + i * 12, 77 + i * 12],
            [20, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }
          );
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 24px",
                borderRadius: 12,
                backgroundColor: "#FFFFFF",
                border: "1px solid #E8E5E1",
                opacity: stepOpacity,
                transform: `translateY(${stepY}px)`,
              }}
            >
              <div style={{ fontSize: 28 }}>{step.icon}</div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#111",
                  maxWidth: 280,
                  lineHeight: 1.4,
                }}
              >
                {step.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
