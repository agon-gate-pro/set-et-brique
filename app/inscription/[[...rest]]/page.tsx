import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default function SignUpPage() {
  return (
    <section className="studs-sky border-b-[3px] border-ink">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 flex flex-col items-center gap-8">
        <div className="text-center max-w-md">
          <h1 className="text-3xl md:text-5xl font-bold">Créer un compte</h1>
          <p className="mt-3 text-slate-ink">
            Un compte sert à réserver un set et à suivre vos locations.
          </p>
        </div>
        <SignUp />
      </div>
    </section>
  );
}
