import Link from "next/link";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { ScrollWords } from "@/components/marketing/scroll-words";
import { SiteNav } from "@/components/marketing/site-nav";
import { Brand } from "@/components/layout/brand";

const ROLES = [
  {
    title: "Corps members",
    points: ["Register with your state code", "Check in by scanning the venue QR", "Submit excuses with evidence", "See your full attendance history"],
  },
  {
    title: "CDS executives",
    points: ["Approve members of your group", "Run sessions and display the QR", "Record corrections — with a reason", "Review excuses and group reports"],
  },
  {
    title: "Local Government Inspectors",
    points: ["Oversee every group in your LGA", "Compare attendance across groups", "Assign executives", "Audit every administrative action"],
  },
];

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <ScrollWords />
        <Features />
        <section className="bg-white py-32">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">One platform. Three clear roles.</h2>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {ROLES.map((role) => (
                <div key={role.title} className="border-t border-hairline pt-6">
                  <h3 className="text-lg font-semibold">{role.title}</h3>
                  <ul className="mt-4 space-y-3 text-muted">
                    {role.points.map((p) => (
                      <li key={p} className="flex gap-3">
                        <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="relative overflow-hidden bg-brand-deep px-6 py-32 text-center text-white">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgb(45_212_191/0.35),transparent)]" />
          <div className="relative mx-auto max-w-3xl">
            <h2 className="text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Ready for Thursday?</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">Create your account and your group executive will approve you.</p>
            <Link
              href="/register"
              className="mt-10 inline-flex h-13 items-center rounded-full bg-white px-8 font-medium text-brand-deep shadow-lift transition-transform hover:-translate-y-0.5"
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted sm:flex-row">
        <Brand />
        <p>Attendance data is handled under your LGA&apos;s data-protection policy.</p>
      </footer>
    </>
  );
}
