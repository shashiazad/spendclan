import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Mobile or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const identifier = credentials.identifier.trim();

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { mobileNumber: identifier },
            ],
          },
        });

        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword,
        );

        if (!valid) {
          return null;
        }

        if (!user.emailVerified) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastActive: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email || user.mobileNumber,
          currency: user.currency,
          role: user.role,
          profilePhoto: user.profilePhoto,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.currency = user.currency;
        token.role = user.role;
        token.profilePhoto = user.profilePhoto;
      }
      if (trigger === "update" && session) {
        if (session.profilePhoto !== undefined) {
          token.profilePhoto = session.profilePhoto;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.currency = token.currency as string;
        session.user.role = token.role as string;
        session.user.profilePhoto = token.profilePhoto as string | null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
