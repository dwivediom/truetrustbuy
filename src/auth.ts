import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/** DB + bcrypt load only inside `authorize` (Node route handlers), never in Edge middleware. */

/**
 * Auth.js requires a secret to sign cookies/JWTs. In development we fall back so local `.env`
 * can omit it; production must set `AUTH_SECRET` (or legacy `NEXTAUTH_SECRET`).
 */
function authSecret(): string | undefined {
  const fromEnv = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    return "dev-only-truetrustbuy-auth-secret-min-32-chars-do-not-use-in-prod";
  }
  return undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret(),
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const [{ connectDb }, { UserModel }, { compare }] = await Promise.all([
          import("@/lib/db"),
          import("@/lib/models/User"),
          import("bcryptjs"),
        ]);
        await connectDb();
        const user = await UserModel.findOne({
          email: String(credentials.email).toLowerCase().trim(),
        })
          .select("email name role passwordHash")
          .lean<{
            _id: string;
            email: string;
            name: string;
            role: string;
            passwordHash: string;
          } | null>();
        if (!user) return null;
        const ok = await compare(String(credentials.password), user.passwordHash);
        if (!ok) return null;
        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "buyer";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
        session.user.role = String(token.role ?? "buyer");
      }
      return session;
    },
  },
});
