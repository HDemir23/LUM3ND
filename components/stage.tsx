import type { ReactNode } from "react";
import Mosaic, { ScenePhoto } from "./mosaic";
import ExtensionCta from "./extension-cta";

export default function Stage({
  mosaic,
  photo,
  children,
}: {
  mosaic?: boolean;
  photo?: string;
  children: ReactNode;
}) {
  return (
    <div className="stage">
      {mosaic ? <Mosaic /> : null}
      {photo ? <ScenePhoto src={photo} /> : null}
      <div className="stage-center">{children}</div>
      <ExtensionCta />
    </div>
  );
}
