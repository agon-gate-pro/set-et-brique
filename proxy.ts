import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes qui exigent d'être connecté. Le contrôle du rôle (gérant, superadmin)
// se fait ensuite côté serveur dans app/admin/layout.tsx via lib/auth.ts.
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/compte(.*)",
  "/catalogue/(.*)/reserver(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et les internals Next.js
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest))(?:.*)|api|trpc)(.*)",
  ],
};
