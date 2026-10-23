import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomePageClient } from "@/components/HomePageClient";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "SpendClan — Split Group Expenses & Settle Up",
  description:
    "Split shared expenses with flatmates, trips and friends. See who owes whom and settle up in the fewest payments — on a privacy-first platform.",
  keywords: [
    "group expenses",
    "group splits",
    "bill splitting",
    "split with friends",
    "settle up",
  ],
};

export default async function HomePage() {
  // Signed in: the app is the home page
  if ((await getSession())?.user?.id) redirect("/groups");
  return <HomePageClient />;
}
