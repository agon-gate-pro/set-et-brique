"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ConfirmButton, FormMessage, SubmitButton } from "@/components/admin/form";
import { acceptBooking, refuseBooking } from "./actions";

/** Boutons de décision sur une demande à traiter (dans la pop-up de détail). */
export function ListActions({ bookingId, onSuccess }: { bookingId: string; onSuccess?: () => void }) {
  const [acceptState, acceptAction] = useActionState(acceptBooking, null);
  const [refuseState, refuseAction] = useActionState(refuseBooking, null);

  const [prevAcceptState, setPrevAcceptState] = useState(acceptState);
  if (acceptState !== prevAcceptState) {
    setPrevAcceptState(acceptState);
    if (acceptState?.ok) onSuccess?.();
  }
  const [prevRefuseState, setPrevRefuseState] = useState(refuseState);
  if (refuseState !== prevRefuseState) {
    setPrevRefuseState(refuseState);
    if (refuseState?.ok) onSuccess?.();
  }

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
        <ConfirmButton
          asDialog
          state={refuseState}
          confirmLabel="Oui, refuser"
          className="btn btn-brick text-paper no-underline"
        >
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
