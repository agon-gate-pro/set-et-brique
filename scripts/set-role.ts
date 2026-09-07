/**
 * Attribue un rôle à un utilisateur Clerk à partir de son email.
 *
 *   pnpm role marion@example.com admin
 *   pnpm role contact@agon-gate.com superadmin
 *   pnpm role marion@example.com none        # retire le rôle
 *
 * L'utilisateur doit d'abord avoir créé son compte sur le site.
 */
import { createClerkClient } from "@clerk/backend";

const [email, roleArg] = process.argv.slice(2);
const roles = ["admin", "superadmin", "none"] as const;

if (!email || !roleArg || !(roles as readonly string[]).includes(roleArg)) {
  console.error("Usage : pnpm role <email> <admin|superadmin|none>");
  process.exit(1);
}

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("CLERK_SECRET_KEY manquante : lance `vercel env pull`.");
  process.exit(1);
}

const clerk = createClerkClient({ secretKey });

async function main() {
  const { data } = await clerk.users.getUserList({ emailAddress: [email], limit: 2 });
  if (data.length === 0) {
    console.error(`Aucun compte avec l'email ${email}. La personne doit d'abord s'inscrire sur le site.`);
    process.exit(1);
  }
  const user = data[0];
  const role = roleArg === "none" ? null : roleArg;
  await clerk.users.updateUserMetadata(user.id, { publicMetadata: { role } });
  console.log(`${email} (${user.id}) : rôle ${role ?? "retiré"}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
