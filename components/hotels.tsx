import { Bed } from "@phosphor-icons/react/dist/ssr";
import Stage from "./stage";
import Waitlist from "./waitlist";

export default function Hotels() {
  return (
    <Stage photo="/backgrounds/local-commerce-v2.avif">
      <Waitlist
        icon={<Bed size={20} weight="fill" />}
        title="Stays waitlist"
        subtitle="Get notified when hotel booking opens."
      />
    </Stage>
  );
}
