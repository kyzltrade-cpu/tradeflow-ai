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

export const ProblemScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headlineOpacity = interpolate(frame, [8, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [8, 28], [25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const subtextOpacity = interpolate(frame, [30, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Clock counting 02:15 → 09:42
  const clockProgress = interpolate(frame, [20, 135], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hours = Math.floor(interpolate(clockProgress, [0, 1], [2, 9]));
  const minutes = Math.floor(interpolate(clockProgress, [0, 1], [15, 42]));
  const clockStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

  const clockOpacity = interpolate(frame, [15, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phone slides in
  const phoneX = interpolate(frame, [0, 30], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const phoneOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Messages appear one by one — customer sending into void
  const msg1 = spring({ frame, fps, delay: 30, config: { damping: 15, stiffness: 100 } });
  const msg2 = spring({ frame, fps, delay: 65, config: { damping: 15, stiffness: 100 } });
  const msg3 = spring({ frame, fps, delay: 100, config: { damping: 15, stiffness: 100 } });

  // "Seen" checkmarks appear after each message
  const seen1 = interpolate(frame, [45, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const seen2 = interpolate(frame, [80, 87], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const seen3 = interpolate(frame, [115, 122], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Warning after all 3 messages ignored
  const warningOpacity = interpolate(frame, [125, 138], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Deal lost badge
  const dealScale = spring({
    frame,
    fps,
    delay: 140,
    config: { damping: 12, stiffness: 120 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FAF9F6",
        fontFamily,
      }}
    >
      {/* Left: Text */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: "50%",
          transform: "translateY(-50%)",
          maxWidth: 560,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#CC3340",
            textTransform: "uppercase",
            letterSpacing: "3px",
            marginBottom: 18,
            opacity: labelOpacity,
          }}
        >
          The Problem
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: "#111",
            lineHeight: 1.1,
            letterSpacing: "-2px",
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
          }}
        >
          Your competitor replied in{" "}
          <span style={{ color: "#CC3340" }}>12 minutes</span>.
          <br />
          You replied in{" "}
          <span style={{ color: "#CC3340" }}>12 hours</span>.
        </div>
        <div
          style={{
            fontSize: 19,
            color: "#626260",
            marginTop: 22,
            lineHeight: 1.5,
            opacity: subtextOpacity,
          }}
        >
          While your team sleeps, customers message 3 suppliers simultaneously.
          <br />
          The first to respond wins.
        </div>
      </div>

      {/* Right: Phone + Clock */}
      <div
        style={{
          position: "absolute",
          left: "55%",
          top: "50%",
          transform: `translateY(-50%) translateX(${phoneX}px)`,
          opacity: phoneOpacity,
        }}
      >
        {/* Clock */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 16,
            opacity: clockOpacity,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
              color: "#CC3340",
              letterSpacing: "2px",
            }}
          >
            {clockStr}
          </div>
        </div>

        {/* Phone */}
        <div
          style={{
            width: 280,
            height: 580,
            borderRadius: 28,
            backgroundColor: "#1A1A1A",
            padding: 8,
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 22,
              backgroundColor: "#ECE5DD",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                height: 40,
                backgroundColor: "#075E54",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "#CCC",
                }}
              />
              <div style={{ color: "white", fontSize: 12, fontWeight: 600 }}>
                +852 9123 4567
              </div>
            </div>

            {/* Chat area */}
            <div style={{ padding: 10, flex: 1, overflow: "hidden" }}>
              {/* Message 1 — customer asking */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  marginBottom: 10,
                  transform: `translateY(${interpolate(msg1, [0, 1], [15, 0])}px)`,
                  opacity: msg1,
                }}
              >
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: "8px 12px",
                    borderRadius: 10,
                    borderBottomRightRadius: 2,
                    fontSize: 11,
                    maxWidth: 220,
                    lineHeight: 1.4,
                    color: "#111",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  Hi, need 500 stainless steel bottles with custom logo
                  <div style={{ fontSize: 8, color: "#999", marginTop: 3 }}>
                    2:15 AM
                  </div>
                </div>
                {/* Double check — seen */}
                <div
                  style={{
                    fontSize: 10,
                    color: "#53BDEB",
                    marginTop: 3,
                    opacity: seen1,
                  }}
                >
                  ✓✓
                </div>
              </div>

              {/* Message 2 — follow up */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  marginBottom: 10,
                  transform: `translateY(${interpolate(msg2, [0, 1], [15, 0])}px)`,
                  opacity: msg2,
                }}
              >
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: "8px 12px",
                    borderRadius: 10,
                    borderBottomRightRadius: 2,
                    fontSize: 11,
                    maxWidth: 220,
                    lineHeight: 1.4,
                    color: "#111",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  Hello? Anyone there? I need a quote urgently
                  <div style={{ fontSize: 8, color: "#999", marginTop: 3 }}>
                    4:30 AM
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#53BDEB",
                    marginTop: 3,
                    opacity: seen2,
                  }}
                >
                  ✓✓
                </div>
              </div>

              {/* Message 3 — frustrated */}
              <div
                style={{
                  display: "flex",
                    flexDirection: "column",
                  alignItems: "flex-end",
                  marginBottom: 10,
                  transform: `translateY(${interpolate(msg3, [0, 1], [15, 0])}px)`,
                  opacity: msg3,
                }}
              >
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: "8px 12px",
                    borderRadius: 10,
                    borderBottomRightRadius: 2,
                    fontSize: 11,
                    maxWidth: 220,
                    lineHeight: 1.4,
                    color: "#111",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  Going with another supplier. Thanks.
                  <div style={{ fontSize: 8, color: "#999", marginTop: 3 }}>
                    9:42 AM
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#53BDEB",
                    marginTop: 3,
                    opacity: seen3,
                  }}
                >
                  ✓✓
                </div>
              </div>

              {/* Warning */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  backgroundColor: "#FFF5F5",
                  borderRadius: 8,
                  marginBottom: 8,
                  opacity: warningOpacity,
                }}
              >
                <div style={{ fontSize: 14 }}>⚠️</div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#CC3340",
                    fontWeight: 600,
                  }}
                >
                  3 messages seen, zero replies
                </div>
              </div>

              {/* Deal lost badge */}
              <div
                style={{
                  transform: `scale(${dealScale})`,
                  padding: "8px 14px",
                  borderRadius: 10,
                  backgroundColor: "#CC3340",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Deal lost — USD $14,000 order
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
