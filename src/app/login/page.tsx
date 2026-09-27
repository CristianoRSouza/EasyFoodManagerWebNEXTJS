import { Suspense } from "react";
import { getServerConfig } from "@/server/gateway";
import { CloudLoginForm } from "@/shared/session/login/CloudLoginForm";
import { LanLoginForm } from "@/shared/session/login/LanLoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const { backend } = getServerConfig();
  return <Suspense>{backend === "cloud" ? <CloudLoginForm /> : <LanLoginForm />}</Suspense>;
}
