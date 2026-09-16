import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function SignInPage() {
  return (
    <section className="studs-sky border-b border-slate-ink/10">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 flex flex-col items-center gap-8">
        <h1 className="text-3xl md:text-5xl font-bold text-center">Connexion</h1>
        <SignIn />
      </div>
    </section>
  );
}
