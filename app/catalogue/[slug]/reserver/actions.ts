"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingError, createBookingRequest, upsertCustomer } from "@/lib/bookings";
import { bookingRequestSchema, firstError, formToObject } from "@/lib/validation";
import type { ActionState } from "@/components/admin/form";

export async function submitBookingRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await auth();
  const setId = String(formData.get("setId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!userId) redirect(`/connexion?redirect_url=/catalogue/${slug}/reserver`);

  const parsed = bookingRequestSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const user = await currentUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };

  const customer = await upsertCustomer(user, {
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone,
    addressLine: d.addressLine,
    postalCode: d.postalCode,
    city: d.city,
  });
  if (customer.blocked) {
    return { error: "Votre compte ne permet plus de réserver. Contactez-nous pour en discuter." };
  }

  let reference: string;
  try {
    const booking = await createBookingRequest({
      setId,
      customerId: customer.id,
      pickupPointId: d.pickupPointId,
      startDate: d.startDate,
      days: d.days,
      pickupTime: d.pickupTime,
      customerNote: d.customerNote,
    });
    reference = booking.reference;
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }

  revalidatePath("/compte");
  revalidatePath("/admin/reservations");
  redirect(`/compte?demande=${reference}`);
}
