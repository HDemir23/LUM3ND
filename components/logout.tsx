"use client";
import { useRouter } from "next/navigation";
import { ActionForm, api } from "./ui";
export default function Logout() {
  const r = useRouter();
  return (
    <ActionForm
      label="Oturumu kapat"
      onSubmit={async () => {
        await api("auth/logout", { role: "user" });
        r.push("/login");
        r.refresh();
      }}
    >
      <></>
    </ActionForm>
  );
}
