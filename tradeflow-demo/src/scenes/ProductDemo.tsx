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

function ChatBubble({
  showAt,
  text,
  time,
  isAI,
  frame,
  fps,
}: {
  showAt: number;
  text: string;
  time: string;
  isAI: boolean;
  frame: number;
  fps: number;
}) {
  if (frame < showAt) return null;
  const entrance = spring({
    frame: frame - showAt,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isAI ? "flex-start" : "flex-end",
        marginBottom: 6,
        transform: `translateY(${interpolate(entrance, [0, 1], [12, 0])}px)`,
        opacity: entrance,
      }}
    >
      <div
        style={{
          backgroundColor: isAI ? "#D9FDD3" : "#FFFFFF",
          padding: "8px 12px",
          borderRadius: 10,
          borderBottomLeftRadius: isAI ? 2 : 10,
          borderBottomRightRadius: isAI ? 10 : 2,
          fontSize: 12,
          maxWidth: 250,
          lineHeight: 1.4,
          color: "#111",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {text}
        <div style={{ fontSize: 8, color: "#999", marginTop: 3 }}>{time}</div>
      </div>
    </div>
  );
}

function TypingIndicator({
  showAt,
  hideAt,
  frame,
}: {
  showAt: number;
  hideAt: number;
  frame: number;
}) {
  if (frame < showAt || frame >= hideAt) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "8px 12px",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        width: 44,
        marginBottom: 6,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: "#999",
            transform: `translateY(${interpolate(
              (frame + i * 5) % 18,
              [0, 9, 18],
              [0, -3, 0]
            )}px)`,
          }}
        />
      ))}
    </div>
  );
}

function Cursor({
  x,
  y,
  clicking,
}: {
  x: number;
  y: number;
  clicking: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${clicking ? 0.85 : 1})`,
        zIndex: 100,
        pointerEvents: "none",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
      }}
    >
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
        <path
          d="M2 1L20 13L11 15L7 24L2 1Z"
          fill="white"
          stroke="#333"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {clicking && (
        <div
          style={{
            position: "absolute",
            left: -10,
            top: -10,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "2px solid rgba(10, 110, 92, 0.4)",
          }}
        />
      )}
    </div>
  );
}

export const ProductDemo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Dashboard entrance: slide up + fade ──
  const dashboardY = interpolate(frame, [95, 115], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const dashboardOpacity = interpolate(frame, [95, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Phone: slide in from left, fade out ──
  const phoneX = interpolate(frame, [0, 18], [-40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const phoneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const phoneFadeOut = interpolate(frame, [100, 118], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Side label ──
  const labelOpacity = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelY = interpolate(frame, [10, 22], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const labelFadeOut = interpolate(frame, [100, 118], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── CURSOR PATH (precise coordinates on actual UI elements) ──
  // Dashboard is 1100x640, centered at (960,540) → top-left at (410, 220)
  // Sidebar: 200px wide → x: 410-610
  // "Conversations" nav item: x~510, y~310 (3rd item, ~80px from sidebar top)
  // Conversation list starts at x=610, first row "Sarah Chen": x~650, y~340
  // Chat panel header "Take Over" button: x~1460, y~295
  // Reply textarea: x~1200, y~580
  // "Settings" nav item: x~510, y~420

  const cursorPath = [
    // Start off-screen, move to Conversations nav
    { x: 960, y: 180, frame: 115 },
    { x: 510, y: 310, frame: 132 },
    // Click Conversations
    { x: 510, y: 310, frame: 138, click: true },
    // Move to Sarah Chen row
    { x: 650, y: 340, frame: 150 },
    // Click Sarah Chen
    { x: 650, y: 340, frame: 156, click: true },
    // Move to Take Over button
    { x: 1460, y: 295, frame: 178 },
    // Click Take Over
    { x: 1460, y: 295, frame: 185, click: true },
    // Move to reply textarea
    { x: 1150, y: 570, frame: 200 },
    // Click reply area (typing happens here)
    { x: 1150, y: 570, frame: 206, click: true },
    // Move to Settings nav
    { x: 510, y: 420, frame: 232 },
    // Click Settings
    { x: 510, y: 420, frame: 238, click: true },
    // Move to System Prompt area
    { x: 1100, y: 420, frame: 255 },
    // Click to "type" in prompt
    { x: 1100, y: 420, frame: 260, click: true },
    // Move to Save button
    { x: 960, y: 540, frame: 278 },
    // Click Save
    { x: 960, y: 540, frame: 284, click: true },
  ];

  let cursorX = 960;
  let cursorY = 180;
  let cursorClicking = false;

  for (let i = 0; i < cursorPath.length - 1; i++) {
    const curr = cursorPath[i];
    const next = cursorPath[i + 1];
    if (frame >= curr.frame && frame < next.frame) {
      const t = (frame - curr.frame) / (next.frame - curr.frame);
      // Smooth ease
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      cursorX = interpolate(ease, [0, 1], [curr.x, next.x]);
      cursorY = interpolate(ease, [0, 1], [curr.y, next.y]);
      cursorClicking = curr.click || false;
      break;
    }
    if (i === cursorPath.length - 2) {
      cursorX = next.x;
      cursorY = next.y;
      cursorClicking = next.click || false;
    }
  }

  const showCursor = frame >= 120 && frame <= 290;

  const conversations = [
    { name: "Sarah Chen", msg: "Can you do FOB to Singapore?", time: "2m", unread: 1 },
    { name: "Ah Wei", msg: "MOQ for 500ml bottles?", time: "5m", unread: 1 },
    { name: "David Tan", msg: "Thanks for the quote!", time: "12m", unread: 0 },
    { name: "Li Ming", msg: "What certifications?", time: "18m", unread: 0 },
  ];

  // Sidebar nav items
  const navItems = ["Dashboard", "Conversations", "Products", "Knowledge Base", "FAQ Rules", "Settings"];

  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6", fontFamily }}>
      {/* ── WhatsApp Phone (left side) ── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: "50%",
          transform: `translateY(-50%) translateX(${phoneX}px)`,
          opacity: phoneOpacity * phoneFadeOut,
        }}
      >
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
          <div style={{ height: "100%", borderRadius: 22, backgroundColor: "#ECE5DD", overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
              <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#CCC" }} />
              <div style={{ color: "white", fontSize: 12, fontWeight: 600 }}>+852 9123 4567</div>
            </div>
            <div style={{ padding: 10, flex: 1, overflow: "hidden" }}>
              <ChatBubble showAt={0} text="Hi, need 500 stainless steel bottles with custom logo" time="2:15 AM" isAI={false} frame={frame} fps={fps} />
              <ChatBubble showAt={12} text="What's the MOQ?" time="2:15 AM" isAI={false} frame={frame} fps={fps} />
              <TypingIndicator showAt={25} hideAt={42} frame={frame} />
              <ChatBubble showAt={42} text="500ml: HKD $28/unit. MOQ 100. Logo +$3. Total: $15,500" time="2:15 AM" isAI={true} frame={frame} fps={fps} />
              <ChatBubble showAt={75} text="Can you do FOB to Singapore?" time="3:42 AM" isAI={false} frame={frame} fps={fps} />
              <TypingIndicator showAt={88} hideAt={100} frame={frame} />
              <ChatBubble showAt={100} text="FOB HK: $14,250. Shipping ~$400. Sending quote now!" time="3:42 AM" isAI={true} frame={frame} fps={fps} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Side label ── */}
      <div
        style={{
          position: "absolute",
          left: 420,
          top: "50%",
          transform: `translateY(-50%) translateY(${labelY}px)`,
          opacity: labelOpacity * labelFadeOut,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0A6E5C", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>
          AI Sales Assistant + Human Takeover
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: "#111", lineHeight: 1.1, letterSpacing: "-1.5px" }}>
          Handles every<br />conversation.
        </div>
        <div style={{ fontSize: 18, color: "#888", lineHeight: 1.5, maxWidth: 380, marginTop: 16 }}>
          AI handles the routine. One tap to take over when it matters.<br />Product knowledge, pricing, quotes. 3 languages. 24/7.
        </div>
        <div style={{ padding: "8px 20px", borderRadius: 12, backgroundColor: "#0A6E5C", color: "white", fontSize: 16, fontWeight: 700, marginTop: 20, display: "inline-block" }}>
          Avg reply: 2.1 seconds
        </div>
      </div>

      {/* ── Dashboard ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translateY(${dashboardY}px)`,
          opacity: dashboardOpacity,
          width: 1100,
          height: 640,
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 16px 56px rgba(0,0,0,0.12)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          display: "flex",
        }}
      >
        {/* Sidebar */}
        <div style={{ width: 200, backgroundColor: "#F8FAFC", borderRight: "1px solid #E2E8F0", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #0A6E5C, #038153)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>TradeFlow</span>
          </div>
          {navItems.map((item, i) => {
            const isActive = frame >= 135 && frame < 238 ? i === 1 : frame >= 238 ? i === 5 : i === 0;
            return (
              <div
                key={item}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  backgroundColor: isActive ? "#EFF6FF" : "transparent",
                  color: isActive ? "#2563EB" : "#64748B",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  marginBottom: 3,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column" }}>
          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>
              {frame >= 238 ? "Settings" : "Conversations"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 12, color: "#64748B", padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                EN / 中文
              </div>
              <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#E2E8F0" }} />
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Total Conversations", value: "1,247" },
              { label: "New This Week", value: "38" },
              { label: "AI Response Rate", value: "94%" },
              { label: "Avg Response", value: "< 3s" },
            ].map((kpi, i) => {
              const kpiScale = spring({
                frame: Math.max(0, frame - 108 - i * 4),
                fps,
                config: { damping: 15, stiffness: 100 },
              });
              return (
                <div
                  key={kpi.label}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor: "#F8FAFD",
                    border: "1px solid #E2E8F0",
                    transform: `scale(${kpiScale})`,
                  }}
                >
                  <div style={{ fontSize: 10, color: "#64748B" }}>{kpi.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#0A6E5C" }}>{kpi.value}</div>
                </div>
              );
            })}
          </div>

          {/* Conversations view */}
          {frame < 238 && (
            <div style={{ display: "flex", flex: 1, gap: 12 }}>
              {/* Conversation list */}
              <div style={{ width: 280, backgroundColor: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", padding: "0 8px" }}>
                  {["All", "AI", "Human", "Flagged"].map((tab, i) => (
                    <div
                      key={tab}
                      style={{
                        padding: "8px 12px",
                        fontSize: 11,
                        fontWeight: i === 0 ? 600 : 400,
                        color: i === 0 ? "#2563EB" : "#94A3B8",
                        borderBottom: i === 0 ? "2px solid #2563EB" : "none",
                      }}
                    >
                      {tab}
                    </div>
                  ))}
                </div>
                {conversations.map((c, i) => {
                  const rowOpacity = interpolate(frame, [128 + i * 6, 134 + i * 6], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  const isSelected = i === 0 && frame >= 156;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderBottom: "1px solid #F1F5F9",
                        gap: 10,
                        backgroundColor: isSelected ? "#EFF6FF" : "transparent",
                        opacity: rowOpacity,
                      }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: isSelected ? "#BFDBFE" : "#E2E8F0", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{c.name}</span>
                          <span style={{ fontSize: 9, color: "#94A3B8" }}>{c.time}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.msg}
                        </div>
                      </div>
                      {c.unread > 0 && (
                        <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#0A6E5C", color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {c.unread}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Chat panel */}
              {frame >= 156 && (
                <div style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#BFDBFE" }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Sarah Chen</div>
                        <div style={{ fontSize: 10, color: "#25D366" }}>Online</div>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        backgroundColor: frame >= 185 ? "#FEF3C7" : "#0A6E5C",
                        color: frame >= 185 ? "#92400E" : "white",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {frame >= 185 ? "Release to AI" : "Take Over"}
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, padding: 16, overflow: "hidden" }}>
                    {[
                      { text: "Can you do FOB to Singapore?", isAI: false, time: "3:42 AM" },
                      { text: "FOB HK: $14,250. Shipping ~$400.", isAI: true, time: "3:42 AM" },
                      { text: "What about certifications?", isAI: false, time: "3:45 AM" },
                      { text: "We have ISO 9001, SGS, and FDA.", isAI: true, time: "3:45 AM" },
                    ].map((msg, i) => {
                      const msgEntrance = spring({
                        frame: Math.max(0, frame - 163 - i * 8),
                        fps,
                        config: { damping: 15, stiffness: 100 },
                      });
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: msg.isAI ? "flex-start" : "flex-end",
                            marginBottom: 10,
                            opacity: msgEntrance,
                            transform: `translateY(${interpolate(msgEntrance, [0, 1], [8, 0])}px)`,
                          }}
                        >
                          <div style={{ backgroundColor: msg.isAI ? "#F0FDF4" : "#EFF6FF", padding: "8px 14px", borderRadius: 10, maxWidth: 320, fontSize: 12, lineHeight: 1.4, color: "#111" }}>
                            {msg.text}
                            <div style={{ fontSize: 8, color: "#999", marginTop: 3 }}>{msg.time}</div>
                          </div>
                        </div>
                      );
                    })}

                    {frame >= 206 && (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                        <div style={{ backgroundColor: "#EFF6FF", padding: "8px 14px", borderRadius: 10, maxWidth: 320, fontSize: 12, lineHeight: 1.4, color: "#111" }}>
                          Let me check our latest certifications for you.
                          <div style={{ fontSize: 8, color: "#999", marginTop: 3 }}>Just now · Human</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reply */}
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, color: frame >= 206 ? "#111" : "#94A3B8" }}>
                      {frame >= 206 ? "Let me check our latest certifications..." : "Type a message..."}
                    </div>
                    <div style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: "#2563EB", color: "white", fontSize: 12, fontWeight: 600 }}>
                      Send
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings view */}
          {frame >= 238 && (
            <div style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Company Name</div>
                <div style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, color: "#111" }}>
                  HK Trading Co. Ltd
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>System Prompt</div>
                <div style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, color: "#111", lineHeight: 1.5, minHeight: 100 }}>
                  {frame >= 260
                    ? "You are a helpful sales assistant for HK Trading Co. You sell stainless steel bottles, glassware, and kitchen accessories. Always respond with pricing in HKD and mention MOQ."
                    : "You are a helpful sales assistant..."}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ padding: "8px 20px", borderRadius: 8, backgroundColor: "#0A6E5C", color: "white", fontSize: 12, fontWeight: 600 }}>Save Changes</div>
                <div style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #E2E8F0", color: "#64748B", fontSize: 12 }}>Cancel</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCursor && <Cursor x={cursorX} y={cursorY} clicking={cursorClicking} />}
    </AbsoluteFill>
  );
};
