import { AuthShowcase } from "@/components/layout/auth-showcase";
import { Brand } from "@/components/layout/brand";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Brand />
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[26rem]">{children}</div>
        </main>
      </div>
      <AuthShowcase />
    </div>
  );
}
