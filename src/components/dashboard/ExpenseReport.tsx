"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("default", { month: "long" }),
}));

const years = Array.from({ length: 3 }, (_, i) => {
  const y = new Date().getFullYear() - 1 + i;
  return { value: String(y), label: String(y) };
});

export function ExpenseReport() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/report?month=${month}&year=${year}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate report");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    }
    setLoading(false);
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>SpendClan Expense Report</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; }
            h1, h2, h3 { color: #0f172a; }
            h1 { font-size: 1.5rem; border-bottom: 2px solid #10b981; padding-bottom: 8px; }
            h2 { font-size: 1.25rem; margin-top: 2rem; }
            li { margin-bottom: 4px; }
            blockquote { border-left: 3px solid #8b5cf6; padding-left: 1rem; color: #64748b; }
          </style>
        </head>
        <body>
          <div>${simpleMarkdown(report || "")}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Generate Expense Report" description="AI-powered analysis of your monthly spending" />
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)} options={months} />
            <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)} options={years} />
            <Button onClick={generateReport} loading={loading}>
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && !report && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm text-slate-400">Analyzing your spending patterns...</p>
            <p className="text-xs text-slate-500">This may take a few seconds</p>
          </div>
        </Card>
      )}

      {report && (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-200">Report</h3>
            <Button size="sm" variant="secondary" onClick={handlePrint}>
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Print / PDF
            </Button>
          </div>
          <div
            className="ai-markdown text-sm text-slate-300"
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(report) }}
          />
        </Card>
      )}
    </div>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}
