import type { ReactNode } from "react";
import { PanelShell } from "@moduly/ui";
import { logoutAction } from "@/lib/auth-actions";
import { toPanelConfig } from "@/lib/panel-config";

export const maxDuration = 120;

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <PanelShell config={toPanelConfig()} logoutAction={logoutAction}>
      {children}
    </PanelShell>
  );
}
