import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const features = [
  "WhatsApp + WeChat",
  "3 Languages",
  "No Code Setup",
  "Cancel Anytime",
];

export const CTAScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Headline entrance
  const headlineOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineScale = interpolate(frame, [10, 25], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtext
  const subtextOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA button entrance
  const ctaScale = spring({
    frame,
    fps,
    delay: 35,
    config: { damping: 12, stiffness: 120 },
  });

  // CTA pulse (subtle)
  const ctaPulse = interpolate(
    (frame - 60) % 40,
    [0, 20, 40],
    [1, 1.03, 1]
  );
  const showPulse = frame >= 60;

  // Feature badges stagger
  const badges = features.map((f, i) => {
    const badgeScale = spring({
      frame,
      fps,
      delay: 50 + i * 8,
      config: { damping: 12, stiffness: 120 },
    });
    return { text: f, scale: badgeScale };
  });

  // Fine print
  const finePrintOpacity = interpolate(frame, [85, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0A6E5C",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
      }}
    >
      {/* Radial glow behind button */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          transform: `scale(${logoScale})`,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #FFFFFF, #E0F5EE)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#0A6E5C",
              letterSpacing: "-1px",
            }}
          >
            TF
          </div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "white" }}>
          TradeFlow AI
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: "#FFFFFF",
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "-2.5px",
          opacity: headlineOpacity,
          transform: `scale(${headlineScale})`,
        }}
      >
        Never miss a deal again.
      </div>

      {/* Subtext */}
      <div
        style={{
          fontSize: 22,
          color: "rgba(255,255,255,0.7)",
          marginTop: 16,
          opacity: subtextOpacity,
        }}
      >
        Set up in 5 minutes. No code required.
      </div>

      {/* CTA Button */}
      <div
        style={{
          marginTop: 40,
          transform: `scale(${ctaScale * (showPulse ? ctaPulse : 1)})`,
        }}
      >
        <div
          style={{
            padding: "18px 48px",
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
            color: "#0A6E5C",
            fontSize: 24,
            fontWeight: 800,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          Start now — HKD $500/month →
        </div>
      </div>

      {/* Feature badges */}
      <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
        {badges.map((b, i) => (
          <div
            key={i}
            style={{
              padding: "8px 18px",
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              transform: `scale(${b.scale})`,
            }}
          >
            {b.text}
          </div>
        ))}
      </div>

      {/* Fine print */}
      <div
        style={{
          marginTop: 32,
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
          opacity: finePrintOpacity,
        }}
      >
        No contracts · Cancel anytime · Built in Hong Kong
      </div>
    </AbsoluteFill>
  );
};
