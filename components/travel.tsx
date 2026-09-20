import { PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import Stage from "./stage";
import Waitlist from "./waitlist";

export default function Travel() {
  return (
    <Stage photo="/backgrounds/travel-airport-v1.avif">
      <Waitlist
        icon={<PaperPlaneTilt size={20} weight="fill" />}
        title="Flights waitlist"
        subtitle="Get notified when flight booking opens."
      />
    </Stage>
  );
}
