import { auth } from "@/auth";
import { mergeGuestIntakeForUser } from "@/lib/buyer-intake-merge";
import { getGuestTokenFromCookie } from "@/lib/buyer-intake-cookie";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getGuestTokenFromCookie();
  const result = await mergeGuestIntakeForUser(session.user.id, token);
  return Response.json(result);
}
