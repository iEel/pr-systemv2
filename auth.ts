import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifySqlServerCredentials } from "./lib/auth/credentials-provider";
import { normalizeRole } from "./lib/auth/permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        password: { label: "Password", type: "password" },
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials) {
        const user = await verifySqlServerCredentials({
          password: typeof credentials?.password === "string" ? credentials.password : "",
          username: typeof credentials?.username === "string" ? credentials.username : "",
        });

        if (!user) return null;

        return {
          displayName: user.displayName,
          email: user.email,
          id: user.id,
          name: user.displayName,
          role: user.role,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.displayName = user.displayName;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id || "");
        session.user.username = String(token.username || "");
        session.user.displayName = String(token.displayName || session.user.name || "");
        session.user.role = normalizeRole(typeof token.role === "string" ? token.role : null);
      }

      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || "dev-only-it-pr-dms-auth-secret-change-before-production",
  trustHost: true,
});
