import { Sidebar } from "@/components/sidebar";

export default function MagazynLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-moduly-panel className="fixed inset-0 w-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col lg:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
