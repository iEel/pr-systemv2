import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/auth/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      displayName: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    displayName: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    displayName?: string;
    role?: Role;
  }
}
