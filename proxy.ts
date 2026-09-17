import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk ne protège plus les routes ici. La protection par motif d'URL
// (`createRouteMatcher` + `auth.protect()`) est dépréciée : un motif raisonne sur
// des chemins, alors qu'en navigation côté client le routeur peut ne demander au
// serveur que le segment d'une page, sans réexécuter le layout parent. Chaque
// ressource se garde donc elle-même :
//
//   - pages admin      : `requireRole("admin")` en tête de chaque page.tsx
//   - actions admin    : `requireRole("admin")` dans chaque action
//   - pages client     : `auth.protect()` (/compte) ou redirection explicite (tunnel)
//
// `clerkMiddleware()` reste indispensable : il pose le contexte d'authentification
// que lisent `auth()` et `currentUser()`. Il ne fait plus que ça.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et les internals Next.js
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest))(?:.*)|api|trpc)(.*)",
  ],
};
