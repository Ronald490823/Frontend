import { RevealText } from "@/components/motion/reveal-text";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-sm font-medium text-brand">{eyebrow}</p>}
        <RevealText text={title} className="text-3xl font-semibold tracking-[-0.04em] sm:text-[2.6rem] sm:leading-[1.1]" />
        {description && <p className="mt-2 max-w-xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-14">{children}</main>;
}
