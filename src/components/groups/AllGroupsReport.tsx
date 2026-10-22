"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { NETWORK_ERROR, readError } from "@/lib/api-errors";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("default", { month: "long" }),
}));

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - 4 + i;
  return { value: String(y), label: String(y) };
});

/** "Download report" for one month across all of the user's groups (PDF). */
export function AllGroupsReport() {
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/my-groups?month=${month}&year=${year}`);
      if (!res.ok) {
        setError(await readError(res, "Couldn't prepare the report."));
        return;
      }
      const { generateMyGroupsPDF } = await import("@/lib/pdf-generator");
      await generateMyGroupsPDF(await res.json(), currency);
      setOpen(false);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => { setError(null); setOpen(true); }}>
        Download report
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Download all-groups report" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--foreground-muted)]">
            A PDF of every group you&apos;re in for the month: spend, your share and balances.
          </p>
          {error && <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)} options={MONTHS} />
            <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)} options={YEARS} />
          </div>
          <Button onClick={download} loading={pending} className="w-full">
            Download PDF
          </Button>
        </div>
      </Modal>
    </>
  );
}
