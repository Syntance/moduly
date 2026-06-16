import { CmsShell } from "@/components/cms/cms-shell";
import { GlobalContentEditor } from "@/components/cms/global-content-editor";

export default function CmsPage() {
  return (
    <CmsShell>
      <GlobalContentEditor />
    </CmsShell>
  );
}
