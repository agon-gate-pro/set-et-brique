"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

type Status = "idle" | "sending" | "success" | "error";

const inputClass =
  "w-full rounded-2xl border border-slate-ink/15 bg-sky px-5 py-3.5 font-medium text-ink-deep placeholder:text-slate-ink/50 outline-none transition-colors focus:border-brick focus:bg-paper focus:ring-4 focus:ring-brick/15";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = event.currentTarget;
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      const result = await res.json();
      if (result.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="access_key" value="525e9d91-336b-448e-9b13-8349f730cc0b" />
      <input type="hidden" name="from_name" value="Set et Brique - Site Web" />
      <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-bold text-ink-deep">
            Nom
          </label>
          <input id="name" name="name" type="text" required placeholder="Votre nom" className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-bold text-ink-deep">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="votre.email@exemple.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="mb-2 block text-sm font-bold text-ink-deep">
          Objet
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          placeholder="ex : question sur un set, réservation..."
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-bold text-ink-deep">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          placeholder="Comment pouvons-nous vous aider ?"
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="pt-2 text-center">
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn btn-brick disabled:cursor-wait disabled:opacity-60"
        >
          <Send className="h-5 w-5" />
          {status === "sending" ? "Envoi..." : "Envoyer le message"}
        </button>
      </div>

      {status === "success" ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center font-semibold text-emerald-700"
        >
          Message envoyé, merci ! Nous répondons au plus vite.
        </p>
      ) : null}
      {status === "error" ? (
        <p
          role="status"
          className="rounded-xl border border-brick/20 bg-red-50 p-4 text-center font-semibold text-brick-deep"
        >
          Une erreur est survenue. Vous pouvez aussi nous joindre par téléphone ou email.
        </p>
      ) : null}
    </form>
  );
}
