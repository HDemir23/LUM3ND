import Shop from "@/components/shop";
import Stage from "@/components/stage";
import { roleSession } from "@/lib/auth";

export default async function Page() {
  const session = await roleSession("user");
  return (
    <Stage mosaic>
      <Shop notice={!session} />
    </Stage>
  );
}
