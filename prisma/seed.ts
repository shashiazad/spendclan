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
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminAnswer = process.env.SEED_ADMIN_ANSWER || "fluffy";

  if (adminEmail && adminPassword) {
    const password = await bcrypt.hash(adminPassword, 12);
    const answer = await bcrypt.hash(adminAnswer.toLowerCase().trim(), 12);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase().trim() },
      update: { emailVerified: true },
      create: {
        name: "Admin User",
        email: adminEmail.toLowerCase().trim(),
        hashedPassword: password,
        currency: "INR",
        role: "ADMIN",
        securityQuestion: "What was the name of your first pet?",
        securityAnswer: answer,
        emailVerified: true,
      },
    });
    console.log(`Seeded admin user: ${adminEmail} (${admin.id})`);
  } else {
    console.log("Skipping admin user seed (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD environment variables not set).");
  }

  const userPassword = await bcrypt.hash("user123", 12);
  const userAnswer = await bcrypt.hash("mumbai", 12);

  const user = await prisma.user.upsert({
    where: { email: "user@xpensio.app" },
    update: { emailVerified: true },
    create: {
      name: "Demo User",
      email: "user@xpensio.app",
      hashedPassword: userPassword,
      currency: "INR",
      role: "USER",
      securityQuestion: "In what city were you born?",
      securityAnswer: userAnswer,
      emailVerified: true,
    },
  });

  console.log("Seeded users:");
  console.log(`  Demo User:  user@xpensio.app / user123 (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
