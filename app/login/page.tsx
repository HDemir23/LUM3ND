import Login from "@/components/login";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  return (
    <Login role={(await searchParams).role === "admin" ? "admin" : "user"} />
  );
}
