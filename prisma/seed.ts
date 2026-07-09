import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  "postgresql://ledgerly:ledgerly@localhost:5432/ledgerly?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const defaultAdminPassword = await bcrypt.hash("admin123", 12);
  const defaultAdminAnswer = await bcrypt.hash("fluffy", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@spendclan.app" },
    update: { emailVerified: true, mobileVerified: true },
    create: {
      name: "System Admin",
      email: "admin@spendclan.app",
      mobileNumber: "+10000000000",
      hashedPassword: defaultAdminPassword,
      currency: "INR",
      role: "ADMIN",
      securityQuestion: "What was the name of your first pet?",
      securityAnswer: defaultAdminAnswer,
      emailVerified: true,
      mobileVerified: true,
    },
  });
  console.log(`Seeded admin user:  admin@spendclan.app / admin123 (${admin.id})`);

  const userPassword = await bcrypt.hash("user123", 12);
  const userAnswer = await bcrypt.hash("mumbai", 12);

  const user = await prisma.user.upsert({
    where: { email: "user@spendclan.app" },
    update: { emailVerified: true },
    create: {
      name: "Demo User",
      email: "user@spendclan.app",
      hashedPassword: userPassword,
      currency: "INR",
      role: "USER",
      securityQuestion: "In what city were you born?",
      securityAnswer: userAnswer,
      emailVerified: true,
    },
  });

  console.log("Seeded users:");
  console.log(`  Demo User:  user@spendclan.app / user123 (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
