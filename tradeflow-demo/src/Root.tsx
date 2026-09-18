import { Composition } from "remotion";
import { TradeFlowViral } from "./TradeFlowViral";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="TradeFlowDemo"
        component={TradeFlowViral}
        durationInFrames={1500}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
