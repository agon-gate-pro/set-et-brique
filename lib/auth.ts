import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Rôles applicatifs, stockés dans `publicMetadata.role` de l'utilisateur Clerk.
 *
 * - `admin`      : les gérants de Set et Brique (Marion et Gaëtan). Gèrent le
 *                  catalogue, les réservations et les contenus.
 * - `superadmin` : Agon-Gate, pour la maintenance. Tout ce que fait un admin,
 *                  plus les réglages techniques et l'attribution des rôles.
 *
 * Un utilisateur sans rôle est un client.
 */
export const ROLES = ["admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

type SessionMetadata = { metadata?: { role?: unknown } };

/**
 * Rôle de l'utilisateur connecté, ou null.
 * Lit d'abord le jeton de session (rapide, si le Dashboard Clerk expose
 * `metadata` dans les claims), sinon interroge l'API Clerk.
 */
export async function getRole(): Promise<Role | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const fromClaims = (sessionClaims as SessionMetadata | null)?.metadata?.role;
  if (isRole(fromClaims)) return fromClaims;

  const user = await currentUser();
  const fromUser = user?.publicMetadata?.role;
  return isRole(fromUser) ? fromUser : null;
}

export async function isAdmin() {
  const role = await getRole();
  return role === "admin" || role === "superadmin";
}

export async function isSuperadmin() {
  return (await getRole()) === "superadmin";
}

/**
 * À appeler en tête d'un layout ou d'une page protégée.
 * Redirige vers la connexion si anonyme, vers l'accueil si le rôle manque.
 */
export async function requireRole(minimum: Role = "admin") {
  const { userId } = await auth();
  if (!userId) redirect("/connexion?redirect_url=/admin");

  const role = await getRole();
  const allowed =
    minimum === "admin" ? role === "admin" || role === "superadmin" : role === "superadmin";
  if (!allowed) redirect("/");

  return { userId, role: role as Role };
}

/** Attribue ou retire un rôle. Réservé au superadmin et au script d'administration. */
export async function setUserRole(clerkUserId: string, role: Role | null) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { role },
  });
}
