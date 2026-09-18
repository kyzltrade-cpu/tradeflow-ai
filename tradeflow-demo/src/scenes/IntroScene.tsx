import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const titleScale = spring({
    frame,
    fps,
    delay: 6,
    config: { damping: 12, stiffness: 100 },
  });

  const taglineOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [20, 38], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const hkOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulseScale = interpolate(frame % 30, [0, 15, 30], [0.85, 1.15, 0.85]);

  const dots = [];
  for (let x = 0; x < 20; x++) {
    for (let y = 0; y < 12; y++) {
      dots.push(
        <div
          key={`${x}-${y}`}
          style={{
            position: "absolute",
            left: x * 96 + 48,
            top: y * 96 + 48,
            width: 3,
            height: 3,
            borderRadius: "50%",
            backgroundColor: "#0A6E5C",
            opacity: 0.06,
          }}
        />
      );
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FAF9F6",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
      }}
    >
      {dots}

      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 18,
          background: "linear-gradient(135deg, #0A6E5C, #038153)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale})`,
          marginBottom: 28,
          boxShadow: "0 12px 40px rgba(10, 110, 92, 0.35)",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 900, color: "white", letterSpacing: "-1px" }}>
          TF
        </div>
      </div>

      <div
        style={{
          fontSize: 76,
          fontWeight: 900,
          color: "#111111",
          letterSpacing: "-3.5px",
          transform: `scale(${titleScale})`,
          lineHeight: 1,
        }}
      >
        TradeFlow AI
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 400,
          color: "#626260",
          marginTop: 22,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}
      >
        Stop losing deals to slow replies
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 44,
          opacity: hkOpacity,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#25D366",
            transform: `scale(${pulseScale})`,
          }}
        />
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#999",
            textTransform: "uppercase",
            letterSpacing: "2.5px",
          }}
        >
          Built in Hong Kong
        </span>
      </div>
    </AbsoluteFill>
  );
};
