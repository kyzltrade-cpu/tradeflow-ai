import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/Inter";
import { IntroScene } from "./scenes/IntroScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { ProductDemo } from "./scenes/ProductDemo";
import { CTAScene } from "./scenes/CTAScene";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const T = 12;

export const TradeFlowDemo = () => {
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Audio
        src={staticFile("bgm.mp3")}
        volume={(f) => {
          if (f < 30) return (f / 30) * 0.2;
          if (f > 840) return ((900 - f) / 60) * 0.2;
          return 0.2;
        }}
      />

      <TransitionSeries>
        {/* Scene 1: Intro (105 frames / 3.5s) */}
        <TransitionSeries.Sequence durationInFrames={105}>
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 2: Problem (150 frames / 5s) */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <ProblemScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 3: Solution (150 frames / 5s) */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <SolutionScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 4: Product Demo (300 frames / 10s) */}
        <TransitionSeries.Sequence durationInFrames={300}>
          <ProductDemo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 5: CTA (243 frames / 8.1s) */}
        <TransitionSeries.Sequence durationInFrames={243}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
