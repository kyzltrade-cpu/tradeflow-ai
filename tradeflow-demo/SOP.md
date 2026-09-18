# TradeFlow AI Demo Video — Production SOP

## Overview
- **Duration:** 30 seconds (900 frames @ 30fps)
- **Resolution:** 1920×1080
- **FPS:** 30
- **Format:** MP4 (H.264)
- **Output:** `out/tradeflow-demo.mp4`

---

## Design System

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#FAF9F6` | Main background (warm cream) |
| `--surface` | `#FFFFFF` | Cards, panels |
| `--text` | `#111111` | Primary text |
| `--muted` | `#626260` | Secondary text |
| `--border` | `#E8E5E1` | Dividers, card borders |
| `--accent` | `#0A6E5C` | Primary teal (CTAs, highlights) |
| `--accent-light` | `#E8F5F1` | Teal backgrounds, badges |
| `--danger` | `#CC3340` | Problem state, urgency |
| `--danger-bg` | `#FFF5F5` | Danger backgrounds |
| `--whatsapp-green` | `#25D366` | WhatsApp icon |
| `--whatsapp-bg` | `#ECE5DD` | WhatsApp chat background |
| `--whatsapp-sent` | `#D9FDD3` | Sent message bubble |

### Typography
- **Font:** Inter (Google Fonts)
- **Weights:** 400, 500, 600, 700
- **Heading:** 48–56px, weight 700, letter-spacing -1.5px
- **Subheading:** 18–20px, weight 400, color `--muted`
- **Body:** 13–15px, weight 400
- **Label:** 11–12px, weight 600, uppercase, letter-spacing 1.5px
- **Small:** 10–11px, weight 400

### Spacing
- Page padding: 100–120px from edges
- Card padding: 24–32px
- Element gap: 12–16px
- Section gap: 32–48px

### Animation Rules
1. **All animation driven by `useCurrentFrame()`** — no CSS transitions
2. **Spring for entrances:** `{ damping: 15, stiffness: 100 }` — natural, no bounce
3. **Interpolate for fades:** `extrapolateRight: 'clamp'`
4. **Easing for slides:** `Easing.out(Easing.quad)` — deceleration feel
5. **Stagger delays:** 8–12 frames between sibling elements
6. **Duration:** Entrance animations 15–25 frames (0.5–0.8s)

### Audio
- **Track:** Ambient corporate pad (generated or royalty-free)
- **Volume:** 0.2 (20%) — background only
- **Fade in:** First 30 frames (1s)
- **Fade out:** Last 60 frames (2s)
- **No voiceover** — text-driven

---

## Scene Breakdown

### Scene 1: Intro (frames 0–105, 3.5s)
**Purpose:** Brand introduction, establish credibility
**Transition:** Fade in (15 frames)

| Element | Timing | Animation |
|---------|--------|-----------|
| Logo mark (gradient square + icon) | Frame 0–25 | Spring scale 0→1, ease out |
| "TradeFlow AI" text | Frame 5–30 | Spring scale 0→1, delay 5 |
| Tagline: "Stop losing deals to slow replies" | Frame 30–55 | Fade in + translateY 20→0 |
| "Built in Hong Kong" + green pulse dot | Frame 55–80 | Fade in, dot scales 0.9→1.1→0.9 on loop |

**Background:** Subtle dot grid at 8% opacity

---

### Scene 2: Problem (frames 105–255, 5s)
**Purpose:** Create urgency, show the cost of slow replies
**Transition:** Slide from right (15 frames)

| Element | Timing | Animation |
|---------|--------|-----------|
| "THE PROBLEM" label | Frame 0–15 | Fade in |
| Headline: "Your competitor replied in 12 minutes. You replied in 12 hours." | Frame 0–25 | Fade in + translateY 40→0 |
| Subtext: "While your team sleeps, customers message 3 suppliers..." | Frame 15–35 | Fade in |
| Clock: "02:15" → "09:42" counting up | Frame 0–120 | Interpolate hours 2→9 |
| Red flash on clock at 2s mark | Frame 60–72 | Opacity flash 0→0.3→0 |
| WhatsApp phone frame | Frame 0 | Spring scale 0.8→1 |
| Chat bubble 1 (customer): "Hi, I need 500 bottles..." | Frame 15 | Spring translateY 30→0 |
| Typing dots (3 bouncing) | Frame 45–65 | Loop translateY 0→-5→0 |
| Chat bubble 2 (AI): "Yes! 500ml: HKD $28/unit..." | Frame 65 | Spring translateY 30→0 |
| Warning: "No one replied — customer went to competitor" | Frame 100 | Fade in with red icon |
| Lost deal badge: "Deal lost — USD $14,000 order" | Frame 115 | Spring scale 0.8→1 |

**Background:** Same cream, clock gets red flash overlay

---

### Scene 3: Solution (frames 255–405, 5s)
**Purpose:** Introduce TradeFlow as the answer
**Transition:** Fade (15 frames)

| Element | Timing | Animation |
|---------|--------|-----------|
| "THE SOLUTION" label | Frame 0–15 | Fade in |
| Headline: "TradeFlow replies in under 3 seconds." | Frame 0–25 | Fade in + translateY 40→0 |
| Stat 1: "< 3s" | Frame 25 | Spring scale 0.8→1 |
| Stat 2: "24/7" | Frame 40 | Spring scale 0.8→1 |
| Stat 3: "3" (languages) | Frame 55 | Spring scale 0.8→1 |
| Step 1: "Customer messages WhatsApp / WeChat" | Frame 70 | Fade in + translateY 20→0 |
| Step 2: "AI reads your catalog & knowledge base" | Frame 82 | Fade in + translateY 20→0 |
| Step 3: "Instant reply with pricing, MOQ, specs" | Frame 94 | Fade in + translateY 20→0 |

**Layout:** Centered, stats in row, steps in row below

---

### Scene 4: Product Demo (frames 405–705, 10s)
**Purpose:** Show the actual product in action
**Transition:** Fade (15 frames)

**This is the hero scene. Must be polished.**

#### Dashboard Shell
- Full dashboard: sidebar (220px) + main content
- Top bar with "EN / 中文" toggle and user avatar
- Sidebar nav items: Dashboard, Conversations, Products, Knowledge Base, FAQ Rules, Settings
- Active item highlighted in blue

#### Cursor
- Custom SVG arrow cursor with subtle shadow
- Moves smoothly between points using linear interpolation
- Click animation: scale 1→0.85→1 over 3 frames
- Click ring effect: expanding circle on click

#### Cursor Path (frame-indexed):
```
0:   Center (960, 540) — starting position
20:  Move to Conversations nav (680, 420)
35:  Click Conversations
50:  Move to first conversation (760, 340)
65:  Click Sarah Chen
80:  Chat panel loads, move to reply area (1200, 650)
100: Start typing in reply
130: Move to "Take Over" button (1350, 520)
145: Click Take Over
160: Move back to chat (1200, 650)
175: Typing in human mode
195: Move to Settings nav (680, 560)
210: Click Settings
225: Move to System Prompt textarea (1100, 400)
240: Start typing prompt
270: Move to Save button (1200, 650)
285: Click Save
300: End position
```

#### Dashboard View (frames 0–80):
- 4 KPI cards: Conversations (1,247), New Clients (38), AI Response Rate (94%), Avg Response (< 3s)
- Bar chart with 12 bars, animated height entrance
- Each bar staggered 3 frames apart

#### Conversations View (frames 80–200):
- Filter tabs: All, AI, Human, Flagged
- 5 conversation rows with staggered entrance
- Row 1 (Sarah Chen) highlighted when selected
- Chat panel with 4 messages (customer + AI alternating)
- Messages appear with staggered spring entrance
- Reply textarea with typing animation
- "Take Over" button appears, then changes to "Release to AI" after click
- Human-typed message appears after takeover

#### Settings View (frames 200–300):
- Company name field
- System Prompt textarea with typing animation
- Save/Cancel buttons

---

### Scene 5: CTA (frames 705–900, 6.5s)
**Purpose:** Drive action
**Transition:** Slide from bottom (15 frames)

| Element | Timing | Animation |
|---------|--------|-----------|
| Logo mark + "TradeFlow AI" | Frame 0–20 | Spring scale 0.9→1 |
| Headline: "Never miss a deal again." | Frame 10–30 | Fade in + scale 0.95→1 |
| Subtext: "Set up in 5 minutes. No code required." | Frame 25–45 | Fade in |
| CTA button: "Start now — HKD $500/month" | Frame 35–55 | Spring + subtle pulse loop |
| Feature badges (4) | Frame 50–80 | Staggered spring entrance |
| "No contracts · Cancel anytime · Built in Hong Kong" | Frame 80–100 | Fade in |

**Background:** Radial teal glow behind button

---

## Audio Design

### Background Music
- Ambient corporate pad, 120 BPM feel
- Volume: 20% throughout
- Fade in: 0→20% over first 30 frames (1s)
- Fade out: 20%→0% over last 60 frames (2s)

### Sound Effects (optional, lower priority)
- Soft "pop" on each message appear (100ms, 5% volume)
- Typing click sound during typing sequences
- Button click sound on cursor clicks

---

## Quality Checklist

### Before Rendering
- [ ] All animations driven by `useCurrentFrame()`
- [ ] No CSS transitions or Tailwind animation classes
- [ ] All `<Sequence>` have `premountFor={10}`
- [ ] Audio fade in/out set correctly
- [ ] Cursor path covers all interactive elements
- [ ] Typing animation uses string slicing (not per-char opacity)
- [ ] All springs use `{ damping: 15, stiffness: 100 }` unless specified
- [ ] Interpolation values clamped on both sides
- [ ] No element flashes or disappears unexpectedly

### After Rendering
- [ ] Video plays smoothly at 30fps
- [ ] No jarring cuts between scenes
- [ ] Audio doesn't bleed (no abrupt starts/stops)
- [ ] Cursor moves naturally, not teleporting
- [ ] Typing speed feels natural (~50 WPM)
- [ ] All text is readable (no tiny fonts)
- [ ] Brand colors consistent throughout
- [ ] Total duration ~30 seconds

---

## File Structure
```
tradeflow-demo/
├── public/
│   └── bgm.mp3
├── src/
│   ├── index.ts
│   ├── Root.tsx
│   ├── TradeFlowDemo.tsx
│   └── scenes/
│       ├── IntroScene.tsx
│       ├── ProblemScene.tsx
│       ├── SolutionScene.tsx
│       ├── ProductDemo.tsx
│       └── CTAScene.tsx
├── package.json
└── tsconfig.json
```

---

## Rebuild Notes (v3)

### Issues to Fix
1. Cursor jumps — need smooth interpolation, not teleporting
2. Typing animation too fast/slow — calibrate to 50 WPM
3. Scene transitions too fast — add breathing room
4. Audio ambient track needs better quality
5. Dashboard mockup needs more realistic data
6. Chat bubbles need better spacing and alignment
7. Problem scene clock needs smoother counting
8. CTA button pulse too aggressive — make subtle

### Improvements
1. Add cursor trail/glow for visibility
2. Add message appear sound effects
3. Better stagger timing on conversation list
4. More realistic typing with occasional pauses
5. Dashboard bar chart should animate height smoothly
6. Settings view should show actual editing with cursor highlight
