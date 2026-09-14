import { verifyRequest, type SessionUser } from "@/lib/jwt";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  createdAt: number;
};

function toAppUser(session: SessionUser): AppUser {
  const name = session.email.split("@")[0] || "Kafe Yöneticisi";
  return {
    id: session.id,
    email: session.email,
    name,
    createdAt: 0,
  };
}

/**
 * Server-side user from the Authorization: Bearer JWT.
 * Returns null when the request carries no valid token.
 */
export async function currentUserFrom(
  request: Request,
): Promise<AppUser | null> {
  const session = await verifyRequest(request);
  return session ? toAppUser(session) : null;
}

export { verifyRequest };