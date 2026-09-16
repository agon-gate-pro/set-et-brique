"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ConfirmButton, FormMessage, SubmitButton } from "@/components/admin/form";
import { acceptBooking, refuseBooking } from "./actions";

/** Boutons de décision sur une demande à traiter, directement dans la liste. */
export function ListActions({ bookingId }: { bookingId: string }) {
  const [acceptState, acceptAction] = useActionState(acceptBooking, null);
  const [refuseState, refuseAction] = useActionState(refuseBooking, null);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <form action={acceptAction}>
        <input type="hidden" name="id" value={bookingId} />
        <SubmitButton variant="leaf">Accepter</SubmitButton>
      </form>
      <Link href={`/admin/reservations/${bookingId}#decision`} className="btn btn-sun">
        Modifier
      </Link>
      <form action={refuseAction} className="inline-flex items-center">
        <input type="hidden" name="id" value={bookingId} />
        <ConfirmButton confirmLabel="Oui, refuser" className="btn btn-brick text-paper no-underline">
          Refuser
        </ConfirmButton>
      </form>
      <div className="basis-full">
        <FormMessage state={acceptState} />
        <FormMessage state={refuseState} />
      </div>
    </div>
  );
}
