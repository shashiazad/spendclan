import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://ledgerly:ledgerly@localhost:5432/ledgerly?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("admin123", 12);
  const answer = await bcrypt.hash("fluffy", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ledgerly.com" },
    update: { emailVerified: true },
    create: {
      name: "Admin User",
      email: "admin@ledgerly.com",
      hashedPassword: password,
      currency: "INR",
      role: "ADMIN",
      securityQuestion: "What was the name of your first pet?",
      securityAnswer: answer,
      emailVerified: true,
    },
  });

  const userPassword = await bcrypt.hash("user123", 12);
  const userAnswer = await bcrypt.hash("mumbai", 12);

  const user = await prisma.user.upsert({
    where: { email: "user@ledgerly.com" },
    update: { emailVerified: true },
    create: {
      name: "Demo User",
      email: "user@ledgerly.com",
      hashedPassword: userPassword,
      currency: "INR",
      role: "USER",
      securityQuestion: "In what city were you born?",
      securityAnswer: userAnswer,
      emailVerified: true,
    },
  });

  console.log("Seeded users:");
  console.log(`  Admin: admin@ledgerly.com / admin123 (${admin.id})`);
  console.log(`  User:  user@ledgerly.com / user123 (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
