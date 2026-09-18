import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

// ── Zoom Burst Text ──
function ZoomText({
  children,
  delay = 0,
  fontSize = 72,
  color = "#111",
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: { damping: 12, stiffness: 150 } });
  const scale = interpolate(s, [0, 1], [2.2, 1]);
  const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        fontSize,
        fontWeight: 900,
        color,
        transform: `scale(${scale})`,
        opacity,
        textAlign: "center",
        lineHeight: 1.1,
        letterSpacing: "-2px",
        fontFamily,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── White Flash ──
function Flash({ at, dur = 5 }: { at: number; dur?: number }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < at || frame > at + dur) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: "white", opacity: o, pointerEvents: "none", zIndex: 100 }} />
  );
}

// ── Subtitle ──
function Sub({
  children,
  delay = 0,
  fontSize = 36,
  color = "#666",
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: { damping: 15, stiffness: 100 } });
  const y = interpolate(s, [0, 1], [24, 0]);
  return (
    <div
      style={{
        fontSize,
        color,
        fontWeight: 500,
        opacity: s,
        transform: `translateY(${y}px)`,
        textAlign: "center",
        fontFamily,
        lineHeight: 1.35,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── WhatsApp Phone Shell ──
function WhatsAppPhone({
  children,
  width = 380,
  height = 700,
  style = {},
}: {
  children: React.ReactNode;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ width, height, borderRadius: 36, backgroundColor: "#1A1A1A", padding: 10, boxShadow: "0 30px 80px rgba(0,0,0,0.2)", ...style }}>
      <div style={{ height: "100%", borderRadius: 28, backgroundColor: "#ECE5DD", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ height: 48, backgroundColor: "#075E54", display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#CCC" }} />
          <div style={{ color: "white", fontSize: 17, fontWeight: 600 }}>+852 9123 4567</div>
        </div>
        {/* Chat area */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: 10, overflow: "hidden" }}>{children}</div>
          {/* Text input bar */}
          <div style={{ height: 48, backgroundColor: "#F0F0F0", display: "flex", alignItems: "center", padding: "0 10px", gap: 8, flexShrink: 0, borderTop: "1px solid #DDD" }}>
            <div style={{ flex: 1, height: 32, borderRadius: 16, backgroundColor: "white", border: "1px solid #DDD", display: "flex", alignItems: "center", paddingLeft: 12 }}>
              <span style={{ fontSize: 14, color: "#AAA" }}>Type a message</span>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#075E54", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: 16 }}>▶</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chat Bubble ──
function Bubble({
  text,
  time,
  isAI,
  delay,
}: {
  text: string;
  time: string;
  isAI: boolean;
  delay: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: { damping: 14, stiffness: 120 } });
  const y = interpolate(s, [0, 1], [16, 0]);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isAI ? "flex-start" : "flex-end",
        marginBottom: 6,
        opacity: s,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: isAI ? "#DCF8C6" : "#FFFFFF",
          padding: "7px 11px",
          borderRadius: 8,
          borderBottomLeftRadius: isAI ? 2 : 8,
          borderBottomRightRadius: isAI ? 8 : 2,
          fontSize: 18,
          maxWidth: 280,
          lineHeight: 1.35,
          color: "#111",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        {text}
        <div style={{ fontSize: 11, color: "#999", marginTop: 2, textAlign: "right" }}>{time}</div>
      </div>
    </div>
  );
}

// ── Animated Checkmarks ──
function Checks({ delay }: { delay: number }) {
  const frame = useFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: { damping: 14, stiffness: 140 } });
  const x = interpolate(s, [0, 1], [20, 0]);
  return (
    <div
      style={{
        textAlign: "right",
        fontSize: 15,
        color: "#53BDEB",
        marginBottom: 4,
        opacity: s,
        transform: `translateX(${x}px)`,
      }}
    >
      ✓✓
    </div>
  );
}

function useFrame() {
  return useCurrentFrame();
}

// ── Stat Card ──
function Stat({ value, label, delay }: { value: string; label: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: { damping: 12, stiffness: 150 } });
  const scale = interpolate(s, [0, 1], [2.5, 1]);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${scale})`, opacity: s }}>
      <div style={{ fontSize: 64, fontWeight: 900, color: "#0A6E5C", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 22, color: "#888", marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════
export const TradeFlowViral = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene boundaries
  const HOOK = 90;
  const PROBLEM = 360;
  const SOLUTION = 540;
  const DEMO = 1200;

  // Zoom-through transitions
  const zoom = (start: number, end: number) => ({
    scale: interpolate(frame, [start, end], [1, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) }),
    opacity: interpolate(frame, [start + 5, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  });
  const hookZ = zoom(70, 90);
  const problemZ = zoom(340, 360);
  const solutionZ = zoom(520, 540);
  const demoZ = zoom(1180, 1200);

  // Problem scene phone slide
  const phoneY = interpolate(frame, [100, 130], [300, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const phoneOp = interpolate(frame, [100, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Clock
  const cProg = interpolate(frame, [130, 330], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cH = Math.floor(interpolate(cProg, [0, 1], [2, 9]));
  const cM = Math.floor(interpolate(cProg, [0, 1], [15, 42]));
  const clock = `${cH.toString().padStart(2, "0")}:${cM.toString().padStart(2, "0")}`;

  // CTA pulse
  const ctaP = interpolate(frame, [DEMO + 60, DEMO + 70, DEMO + 80], [1, 1.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A6E5C", fontFamily }}>
      <Audio
        src={staticFile("bgm.mp3")}
        volume={(f) => {
          if (f < 30) return (f / 30) * 0.25;
          if (f > 1440) return ((1500 - f) / 60) * 0.25;
          return 0.25;
        }}
      />

      {/* ════ HOOK (0–90) ════ */}
      {frame < HOOK + 10 && (
        <AbsoluteFill
          style={{
            backgroundColor: "#0A6E5C",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            padding: "0 50px",
            transform: `scale(${hookZ.scale})`,
            opacity: hookZ.opacity,
          }}
        >
          <ZoomText delay={5} fontSize={58} color="white">Your competitor replied</ZoomText>
          <ZoomText delay={18} fontSize={82} color="#FFD700">in 12 minutes.</ZoomText>
          <div style={{ height: 16 }} />
          <ZoomText delay={38} fontSize={58} color="white">You replied in</ZoomText>
          <ZoomText delay={50} fontSize={82} color="#FF6B6B">12 hours.</ZoomText>
        </AbsoluteFill>
      )}

      {/* ════ PROBLEM (90–360) ════ */}
      {frame >= 85 && frame < PROBLEM + 10 && (
        <AbsoluteFill style={{ backgroundColor: "#FAF9F6", transform: `scale(${problemZ.scale})`, opacity: problemZ.opacity }}>
          <Flash at={88} />

          {/* Centered column layout */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 50px", gap: 20 }}>
            <Sub delay={95} fontSize={24} color="#CC3340" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 3 }}>The Problem</Sub>
            <Sub delay={105} fontSize={44} color="#111" style={{ fontWeight: 900, lineHeight: 1.15, marginBottom: 8 }}>
              While you sleep, customers message <span style={{ color: "#CC3340" }}>3 suppliers</span> simultaneously.
            </Sub>

            {/* Clock + Phone grouped together */}
            <div style={{ transform: `translateY(${phoneY}px)`, opacity: phoneOp }}>
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 52, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: "#CC3340", letterSpacing: 3 }}>{clock}</div>
              </div>
              <WhatsAppPhone width={340} height={580}>
                <Bubble text="Hi, need 500 stainless steel bottles with custom logo" time="2:15 AM" isAI={false} delay={130} />
                <Bubble text="Hello? Anyone there? I need a quote urgently" time="4:30 AM" isAI={false} delay={190} />
                <Bubble text="Going with another supplier. Thanks." time="9:42 AM" isAI={false} delay={260} />

                {frame >= 155 && <Checks delay={155} />}
                {frame >= 215 && <Checks delay={215} />}

                {frame >= 300 && (
                  <div style={{ transform: `scale(${spring({ frame: frame - 300, fps, config: { damping: 10, stiffness: 150 } })})`, padding: "10px 16px", borderRadius: 10, backgroundColor: "#CC3340", color: "white", fontSize: 20, fontWeight: 700, textAlign: "center", marginTop: 8 }}>
                    Deal lost — USD $14,000
                  </div>
                )}
              </WhatsAppPhone>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ════ SOLUTION (360–540) ════ */}
      {frame >= 355 && frame < SOLUTION + 10 && (
        <AbsoluteFill style={{ backgroundColor: "#FAF9F6", transform: `scale(${solutionZ.scale})`, opacity: solutionZ.opacity }}>
          <Flash at={358} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, padding: "0 50px" }}>
            <div style={{ transform: `scale(${spring({ frame: frame - 365, fps, config: { damping: 10, stiffness: 120 } })})` }}>
              <div style={{ width: 90, height: 90, borderRadius: 22, background: "linear-gradient(135deg, #0A6E5C, #038153)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(10,110,92,0.3)" }}>
                <div style={{ color: "white", fontSize: 44, fontWeight: 900 }}>T</div>
              </div>
            </div>
            <ZoomText delay={375} fontSize={66} color="#111">TradeFlow AI</ZoomText>
            <Sub delay={390} fontSize={38} color="#888">
              Replies in under <span style={{ color: "#0A6E5C", fontWeight: 900 }}>3 seconds</span>.
            </Sub>
            <div style={{ display: "flex", gap: 48, marginTop: 10 }}>
              <Stat value="<3s" label="Reply time" delay={410} />
              <Stat value="24/7" label="Always on" delay={425} />
              <Stat value="3" label="Languages" delay={440} />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ════ DEMO (540–1200) ════ */}
      {frame >= 535 && frame < DEMO + 10 && (
        <AbsoluteFill style={{ backgroundColor: "#FAF9F6", transform: `scale(${demoZ.scale})`, opacity: demoZ.opacity }}>
          <Flash at={538} />

          {/* Phase 1: AI Chat (540–780) */}
          {frame >= 540 && frame < 790 && (
            <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
              <Sub delay={545} fontSize={24} color="#0A6E5C" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, marginBottom: 10 }}>AI Sales Assistant</Sub>
              <Sub delay={550} fontSize={42} color="#111" style={{ fontWeight: 900, marginBottom: 20 }}>Handles every conversation.</Sub>

              <div style={{ transform: `scale(${spring({ frame: frame - 555, fps, config: { damping: 12, stiffness: 120 } })})` }}>
                <WhatsAppPhone width={360} height={660}>
                  <Bubble text="Hi, need 500 stainless steel bottles" time="2:15 AM" isAI={false} delay={570} />
                  <Bubble text="What's the MOQ?" time="2:15 AM" isAI={false} delay={590} />
                  <Bubble text="500ml: HKD $28/unit. MOQ 100. Logo +$3. Total: $15,500" time="2:15 AM" isAI={true} delay={620} />
                  <Bubble text="Can you do FOB to Singapore?" time="3:42 AM" isAI={false} delay={670} />
                  <Bubble text="FOB HK: $14,250. Shipping ~$400. Sending quote now!" time="3:42 AM" isAI={true} delay={700} />
                </WhatsAppPhone>
              </div>
            </AbsoluteFill>
          )}

          {/* Phase 2: Dashboard with trigger detection + human takeover (780–1060) */}
          {frame >= 780 && frame < 1060 && (() => {
            const cursorPath = [
              { x: 600, y: 350, f: 810 },
              { x: 860, y: 148, f: 925 },
              { x: 860, y: 148, f: 935, click: true },
              { x: 520, y: 505, f: 960 },
              { x: 520, y: 505, f: 965, click: true },
              { x: 790, y: 505, f: 990 },
              { x: 790, y: 505, f: 997, click: true },
            ];
            let cx = 600, cy = 300, clicking = false;
            for (let i = 0; i < cursorPath.length - 1; i++) {
              const curr = cursorPath[i];
              const next = cursorPath[i + 1];
              if (frame >= curr.f && frame < next.f) {
                const t = (frame - curr.f) / (next.f - curr.f);
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                cx = interpolate(ease, [0, 1], [curr.x, next.x]);
                cy = interpolate(ease, [0, 1], [curr.y, next.y]);
                clicking = curr.click || false;
                break;
              }
              if (i === cursorPath.length - 2) { cx = next.x; cy = next.y; clicking = next.click || false; }
            }
            const showCursor = frame >= 850 && frame <= 960;

            const fullText = "Sure! We can do FOB. Let me check with logistics.";
            const typingStart = 968;
            const typingEnd = 988;
            const charsVisible = frame >= typingStart
              ? Math.min(fullText.length, Math.floor(((Math.min(frame, typingEnd) - typingStart) / (typingEnd - typingStart)) * fullText.length))
              : 0;
            const displayText = fullText.slice(0, charsVisible);

            const clickPulse = (at: number) => {
              if (frame >= at && frame < at + 4) return interpolate(frame, [at, at + 2, at + 4], [1, 0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return 1;
            };

            return (
              <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
                <Sub delay={785} fontSize={24} color="#0A6E5C" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, marginBottom: 8 }}>Smart Handoff</Sub>
                <Sub delay={790} fontSize={38} color="#111" style={{ fontWeight: 900, marginBottom: 16 }}>AI knows when to step aside.</Sub>

                <div style={{ position: "relative", width: "100%", maxWidth: 880 }}>
                  <div style={{ width: "100%", height: 560, borderRadius: 14, backgroundColor: "#FFF", boxShadow: "0 16px 50px rgba(0,0,0,0.1)", border: "1px solid #E2E8F0", overflow: "hidden", display: "flex", transform: `scale(${spring({ frame: frame - 800, fps, config: { damping: 12, stiffness: 120 } })})` }}>
                    {/* Sidebar */}
                    <div style={{ width: 150, backgroundColor: "#F8FAFC", borderRight: "1px solid #E2E8F0", padding: 12, flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg, #0A6E5C, #038153)" }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>TradeFlow</span>
                      </div>
                      {["Dashboard", "Conversations", "Products", "Settings"].map((item, i) => (
                        <div key={item} style={{ padding: "5px 8px", borderRadius: 5, backgroundColor: i === 1 ? "#EFF6FF" : "transparent", color: i === 1 ? "#2563EB" : "#64748B", fontSize: 11, fontWeight: i === 1 ? 600 : 400, marginBottom: 2 }}>
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* Main — conversation view */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      {/* Header */}
                      <div style={{ padding: "10px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "#DDD" }} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Sarah Chen</div>
                            <div style={{ fontSize: 11, color: "#22C55E" }}>● Online</div>
                          </div>
                        </div>
                        {frame >= 910 && (
                          <div style={{
                            padding: "6px 16px",
                            borderRadius: 6,
                            backgroundColor: frame >= 935 ? "#DC2626" : "#0A6E5C",
                            color: "white",
                            fontSize: 12,
                            fontWeight: 700,
                            transform: `scale(${clickPulse(930) * spring({ frame: frame - 910, fps, config: { damping: 10, stiffness: 150 } })})`,
                          }}>
                            {frame >= 935 ? "Release to AI" : "✋ Take Over"}
                          </div>
                        )}
                      </div>

                      {/* Chat */}
                      <div style={{ flex: 1, padding: "12px 16px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 8 }}>
                        {/* Customer: normal question */}
                        {frame >= 810 && (
                          <div style={{ display: "flex", justifyContent: "flex-start", opacity: spring({ frame: frame - 810, fps, config: { damping: 14, stiffness: 120 } }) }}>
                            <div style={{ backgroundColor: "#E2E8F0", padding: "7px 11px", borderRadius: 8, borderBottomLeftRadius: 2, fontSize: 14, maxWidth: 280, lineHeight: 1.35, color: "#111" }}>
                              What's the MOQ for 500ml bottles?
                              <div style={{ fontSize: 10, color: "#999", marginTop: 2, textAlign: "right" }}>10:30 AM</div>
                            </div>
                          </div>
                        )}
                        {/* AI handles normal question */}
                        {frame >= 825 && (
                          <div style={{ display: "flex", justifyContent: "flex-end", opacity: spring({ frame: frame - 825, fps, config: { damping: 14, stiffness: 120 } }) }}>
                            <div style={{ backgroundColor: "#DCF8C6", padding: "7px 11px", borderRadius: 8, borderBottomRightRadius: 2, fontSize: 14, maxWidth: 280, lineHeight: 1.35, color: "#111" }}>
                              MOQ is 100 units. $28/unit. Logo +$3.
                              <div style={{ fontSize: 10, color: "#999", marginTop: 2, textAlign: "right" }}>10:30 AM · 🤖 AI</div>
                            </div>
                          </div>
                        )}
                        {/* Customer: TRIGGER WORD message */}
                        {frame >= 845 && (
                          <div style={{ display: "flex", justifyContent: "flex-start", opacity: spring({ frame: frame - 845, fps, config: { damping: 14, stiffness: 120 } }) }}>
                            <div style={{ backgroundColor: "#E2E8F0", padding: "7px 11px", borderRadius: 8, borderBottomLeftRadius: 2, fontSize: 14, maxWidth: 280, lineHeight: 1.35, color: "#111" }}>
                              Can you give me a <span style={{ backgroundColor: "#FEF3C7", padding: "0 3px", borderRadius: 3, fontWeight: 700, color: "#92400E" }}>discount</span> if I order 500?
                              <div style={{ fontSize: 10, color: "#999", marginTop: 2, textAlign: "right" }}>10:32 AM</div>
                            </div>
                          </div>
                        )}
                        {/* AI detection badge */}
                        {frame >= 860 && frame < 915 && (
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <div style={{ fontSize: 11, color: "#92400E", backgroundColor: "#FEF3C7", padding: "4px 12px", borderRadius: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, opacity: spring({ frame: frame - 860, fps, config: { damping: 14, stiffness: 120 } }) }}>
                              <span style={{ fontSize: 13 }}>⚡</span> Trigger detected: <span style={{ fontWeight: 800 }}>"discount"</span> — needs human
                            </div>
                          </div>
                        )}
                        {/* Human reply after takeover */}
                        {frame >= 997 && (
                          <div style={{ display: "flex", justifyContent: "flex-end", opacity: spring({ frame: frame - 997, fps, config: { damping: 14, stiffness: 120 } }) }}>
                            <div style={{ backgroundColor: "#DCF8C6", padding: "7px 11px", borderRadius: 8, borderBottomRightRadius: 2, fontSize: 14, maxWidth: 280, lineHeight: 1.35, color: "#111" }}>
                              For 500+ units I can do $25/unit. That's 11% off. Want me to send a revised quote?
                              <div style={{ fontSize: 10, color: "#999", marginTop: 2, textAlign: "right" }}>10:33 AM · ✋ You</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input bar */}
                      <div style={{ padding: "8px 12px", borderTop: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8, backgroundColor: "#F9FAFB" }}>
                        <div style={{ flex: 1, height: 30, borderRadius: 15, backgroundColor: "white", border: "1px solid #DDD", display: "flex", alignItems: "center", paddingLeft: 10 }}>
                          {displayText ? (
                            <span style={{ fontSize: 12, color: "#333" }}>{displayText}{frame < typingEnd && frame >= typingStart && <span style={{ opacity: frame % 8 < 4 ? 1 : 0 }}>|</span>}</span>
                          ) : (
                            <span style={{ fontSize: 12, color: "#AAA" }}>Type a message...</span>
                          )}
                        </div>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#0A6E5C", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${clickPulse(997)})` }}>
                          <span style={{ color: "white", fontSize: 12 }}>▶</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cursor */}
                  {showCursor && (
                    <div style={{
                      position: "absolute",
                      left: cx,
                      top: cy,
                      transform: "translate(-2, -2)",
                      pointerEvents: "none",
                      zIndex: 200,
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                      {clicking && (
                        <div style={{ position: "absolute", top: 8, left: 8, width: 12, height: 12, borderRadius: "50%", border: "2px solid #0A6E5C", opacity: 0.6, transform: `scale(${interpolate(frame % 10, [0, 5, 10], [0.5, 1.5, 0.5])})` }} />
                      )}
                    </div>
                  )}
                </div>
              </AbsoluteFill>
            );
          })()}

          {/* Phase 3: Stats (1050–1200) */}
          {frame >= 1050 && (
            <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
              <ZoomText delay={1055} fontSize={74} color="#111"><span style={{ color: "#0A6E5C" }}>3 sec</span> avg reply</ZoomText>
              <Sub delay={1070} fontSize={32} color="#888">3 languages • 24/7 • Zero missed leads</Sub>
            </AbsoluteFill>
          )}
        </AbsoluteFill>
      )}

      {/* ════ CTA (1200–1500) ════ */}
      {frame >= 1195 && (
        <AbsoluteFill style={{ backgroundColor: "#0A6E5C", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: "0 50px" }}>
          <Flash at={1198} />
          <div style={{ transform: `scale(${spring({ frame: frame - 1205, fps, config: { damping: 10, stiffness: 120 } })})` }}>
            <div style={{ width: 100, height: 100, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.25)" }}>
              <div style={{ color: "white", fontSize: 52, fontWeight: 900 }}>T</div>
            </div>
          </div>
          <ZoomText delay={1215} fontSize={66} color="white">Never miss a lead.</ZoomText>
          <Sub delay={1230} fontSize={32} color="rgba(255,255,255,0.7)">AI replies in 3 seconds. 24/7. 3 languages.</Sub>
          <div style={{ marginTop: 12, padding: "18px 50px", borderRadius: 14, backgroundColor: "white", color: "#0A6E5C", fontSize: 30, fontWeight: 900, transform: `scale(${ctaP * spring({ frame: frame - 1245, fps, config: { damping: 10, stiffness: 120 } })})`, boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            Start Free Trial →
          </div>
          <Sub delay={1265} fontSize={22} color="rgba(255,255,255,0.5)">tradeflow.ai</Sub>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
