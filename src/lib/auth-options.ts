import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
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

        if (!user || !user.hashedPassword) {
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
          email: user.email || user.mobileNumber || "",
          currency: user.currency,
          role: user.role,
          profilePhoto: user.profilePhoto,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) {
          return false;
        }

        const email = user.email.toLowerCase();

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Register a new user
          const newUser = await prisma.user.create({
            data: {
              name: user.name || "Google User",
              email,
              emailVerified: true,
              profilePhoto: user.image,
              currency: "INR",
            },
          });

          user.id = newUser.id;
          user.currency = newUser.currency;
          user.role = newUser.role;
          user.profilePhoto = newUser.profilePhoto;

          // Automatically join group invitations
          try {
            const invitations = await prisma.groupInvitation.findMany({
              where: { email },
            });

            if (invitations.length > 0) {
              await prisma.groupMember.createMany({
                data: invitations.map((inv) => ({
                  userId: newUser.id,
                  groupId: inv.groupId,
                  role: "MEMBER",
                })),
              });

              await prisma.groupInvitation.deleteMany({
                where: { email },
              });

              // Invalidate dashboards
              const { invalidateDashboard, invalidateGroupMemberDashboards } = await import("@/lib/cache");
              for (const inv of invitations) {
                await invalidateGroupMemberDashboards(inv.groupId);
              }
              invalidateDashboard(newUser.id);
            }
          } catch (e) {
            console.error("Auto-joining groups failed during Google signup:", e);
          }
        } else {
          // User exists, update lastActive and profilePhoto if not set
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              lastActive: new Date(),
              ...(!existingUser.profilePhoto && user.image ? { profilePhoto: user.image } : {}),
            },
          });

          user.id = existingUser.id;
          user.currency = existingUser.currency;
          user.role = existingUser.role;
          user.profilePhoto = existingUser.profilePhoto || user.image;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        if (account?.provider === "google" && user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.currency = dbUser.currency;
            token.role = dbUser.role;
            token.profilePhoto = dbUser.profilePhoto;
          }
        } else {
          token.id = user.id;
          token.currency = user.currency;
          token.role = user.role;
          token.profilePhoto = user.profilePhoto;
        }
      }
      if (trigger === "update" && session) {
        if (session.profilePhoto !== undefined) {
          token.profilePhoto = session.profilePhoto;
        }
        if (session.currency !== undefined) {
          token.currency = session.currency;
        }
        if (session.name !== undefined) {
          token.name = session.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.currency = token.currency as string;
        session.user.role = token.role as string;
        session.user.profilePhoto = token.profilePhoto as string | null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
