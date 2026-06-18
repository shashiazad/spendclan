import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      currency: string;
      role: string;
      profilePhoto?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    currency: string;
    role: string;
    profilePhoto?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    currency: string;
    role: string;
    profilePhoto?: string | null;
  }
}
