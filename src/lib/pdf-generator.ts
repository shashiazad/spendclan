import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper function to format currency value in jsPDF (using standard code to avoid symbol UTF-8 errors)
function formatVal(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

// Helper to asynchronously load image in client browser
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
}

// Helper to draw headers and footers on all pages at the end of generation
async function addHeaderFooter(doc: jsPDF, titleText: string) {
  const totalPages = doc.getNumberOfPages();
  let logoImg: HTMLImageElement | null = null;

  try {
    logoImg = await loadImage("/logo.png");
  } catch (e) {
    console.error("Failed to load logo in PDF generator:", e);
  }

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Top color bar accent
    doc.setFillColor(16, 185, 129); // SpendClan emerald
    doc.rect(0, 0, 210, 4, "F");

    // Draw logo if loaded successfully
    let textStartX = 14;
    if (logoImg) {
      doc.addImage(logoImg, "PNG", 14, 8, 8, 8);
      textStartX = 25;
    }

    // Header logo text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text("SpendClan", textStartX, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // muted slate
    doc.text("Personal Ledger & Group Splits", textStartX + 22, 14);

    // Right-aligned report name
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(titleText, 196, 14, { align: "right" });

    // Thin line divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(14, 18, 196, 18);

    // Bottom line divider
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(0.4);
    doc.line(14, 282, 196, 282);

    // Footer Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // muted
    doc.text("© SpendClan. All rights reserved.", 14, 287);
    doc.text(`Page ${i} of ${totalPages}`, 196, 287, { align: "right" });
  }
}

/**
 * 1. Personal Expense Report PDF Generator
 */
export async function generatePersonalPDF(data: any, currency: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[data.month - 1];
  const reportingPeriod = `${monthName} ${data.year}`;
  const reportTitle = "Personal Expense Report";

  // Page 1 Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // dark slate
  doc.text(reportTitle, 14, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reporting Period: ${reportingPeriod}  |  Generated on ${new Date().toLocaleDateString()}`, 14, 36);

  // Draw Summary Cards
  const cards = [
    { label: "TOTAL INCOME", val: formatVal(data.summary.totalIncome, currency), bg: [236, 253, 245], text: [4, 120, 87] },
    { label: "TOTAL EXPENSES", val: formatVal(data.summary.totalExpenses, currency), bg: [254, 242, 242], text: [153, 27, 27] },
    { label: "TOTAL SAVINGS", val: formatVal(data.summary.totalSavings, currency), bg: [239, 246, 255], text: [30, 64, 175] }, // blue
  ];

  let cardX = 14;
  cards.forEach((card) => {
    // Background card rect
    doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
    doc.rect(cardX, 42, 56, 20, "F");

    // Text details inside card
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cardX + 5, 47);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(card.text[0], card.text[1], card.text[2]);
    doc.text(card.val, cardX + 5, 56);

    cardX += 63;
  });

  // Net cashflow summary text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Remaining Balance: ${formatVal(data.summary.netRemaining, currency)}`, 14, 69);

  let currentY = 74;

  // Category summary table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Category-Wise Summary", 14, currentY);
  currentY += 4;

  const categoryHeaders = [["Category", "Total Spent", "Percentage of Spend"]];
  const categoryRows = data.categoryBreakdown.map((c: any) => [
    c.category,
    formatVal(c.amount, currency),
    `${c.percentage.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: categoryHeaders,
    body: categoryRows,
    theme: "striped",
    headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: "bold" },
    styles: { fontSize: 8.5 },
    margin: { top: 26, left: 14, right: 14, bottom: 20 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Detailed Transactions List
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Detailed Transaction List", 14, currentY);
  currentY += 4;

  const transactionHeaders = [["Date", "Description", "Category", "Payment Method", "Type", "Amount"]];
  const transactionRows = data.expenses.map((e: any) => [
    new Date(e.date).toLocaleDateString(),
    e.notes || e.category,
    e.category,
    e.paymentMethod,
    e.type,
    formatVal(e.amount, currency),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: transactionHeaders,
    body: transactionRows,
    theme: "striped",
    headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: "bold" },
    styles: { fontSize: 8.5 },
    margin: { top: 26, left: 14, right: 14, bottom: 20 },
  });

  // Render headers and footers globally on all pages
  await addHeaderFooter(doc, reportTitle);

  doc.save(`SpendClan_Personal_Report_${monthName}_${data.year}.pdf`);
}

/**
 * 2. My Group Expenses Report PDF Generator
 */
export async function generateMyGroupsPDF(data: any, currency: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[data.month - 1];
  const reportingPeriod = `${monthName} ${data.year}`;
  const reportTitle = "Consolidated Group Expenses Report";

  // Page 1 Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(reportTitle, 14, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reporting Period: ${reportingPeriod}  |  Generated on ${new Date().toLocaleDateString()}`, 14, 36);

  // Overall Group Summary Cards
  const cards = [
    { label: "ACTIVE POCKETS", val: String(data.summary.totalGroups), bg: [241, 245, 249], text: [15, 23, 42] },
    { label: "TOTAL CONTRIBUTED", val: formatVal(data.summary.totalContributed, currency), bg: [236, 253, 245], text: [4, 120, 87] },
    { label: "TOTAL SHARE", val: formatVal(data.summary.totalShare, currency), bg: [254, 242, 242], text: [153, 27, 27] },
  ];

  let cardX = 14;
  cards.forEach((card) => {
    doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
    doc.rect(cardX, 42, 56, 20, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cardX + 5, 47);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(card.text[0], card.text[1], card.text[2]);
    doc.text(card.val, cardX + 5, 56);

    cardX += 63;
  });

  const netBalance = data.summary.totalOutstandingBalance;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Overall Outstanding Balance: ${formatVal(Math.abs(netBalance), currency)} ${
      netBalance === 0 ? "(Settled)" : netBalance > 0 ? "(Receivable)" : "(Owed)"
    }`,
    14,
    69
  );

  let currentY = 76;

  // Render separate section for each group
  data.groups.forEach((group: any, idx: number) => {
    // If it's not the first group, start a new page
    if (idx > 0) {
      doc.addPage();
      currentY = 26;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129);
    doc.text(group.groupName, 14, currentY);
    currentY += 5;

    // Group Statistics Table
    const groupStatHeaders = [["Parameter", "Group Value", "Your Value", "Status / Notes"]];
    const groupStatRows = [
      ["Group Total Expenses", formatVal(group.totalGroupExpenses, currency), "-", "Total spent in pocket during period"],
      ["Your Contribution", "-", formatVal(group.userContribution, currency), "Amount paid directly by you"],
      ["Your Share of Expenses", "-", formatVal(group.userShare, currency), "Your split share allocation"],
      ["Settlements Paid by You", "-", formatVal(group.settlementsPaid, currency), "Repayments you paid to others"],
      ["Settlements Received by You", "-", formatVal(group.settlementsReceived, currency), "Repayments received by you"],
      [
        "Net Outstanding Balance",
        "-",
        formatVal(Math.abs(group.outstandingBalance), currency),
        group.outstandingBalance === 0 ? "Fully Settled" : group.outstandingBalance > 0 ? "You are owed (Receivable)" : "You owe (Owed)"
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: groupStatHeaders,
      body: groupStatRows,
      theme: "striped",
      headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: "bold" },
      styles: { fontSize: 8.5 },
      margin: { top: 26, left: 14, right: 14, bottom: 20 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Group Transactions involving the user in the selected month
    if (group.transactions.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("Group Transactions Involving You", 14, currentY);
      currentY += 4;

      const groupTxHeaders = [["Date", "Description", "Paid By", "Group Total", "Your Share"]];
      const groupTxRows = group.transactions.map((tx: any) => [
        new Date(tx.date).toLocaleDateString(),
        tx.description,
        tx.paidBy,
        formatVal(tx.amount, currency),
        formatVal(tx.userShare, currency),
      ]);

      autoTable(doc, {
        startY: currentY,
        head: groupTxHeaders,
        body: groupTxRows,
        theme: "striped",
        headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: "bold" },
        styles: { fontSize: 8 },
        margin: { top: 26, left: 14, right: 14, bottom: 20 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  });

  // Draw header and footer on all pages
  await addHeaderFooter(doc, reportTitle);

  doc.save(`SpendClan_My_Group_Report_${monthName}_${data.year}.pdf`);
}

/**
 * 3. Individual Group Expense Report PDF Generator
 */
export async function generateIndividualGroupPDF(data: any, currency: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const reportTitle = "Pocket Expense Ledger Report";
  const groupName = data.groupName;

  // Title section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(groupName, 14, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Reporting Period: ${data.reportingPeriod}  |  Total Members: ${data.summary.totalMembers}  |  Generated: ${new Date().toLocaleDateString()}`,
    14,
    36
  );

  // Group Summary Cards
  const cards = [
    { label: "TOTAL SPENT", val: formatVal(data.summary.totalExpenses, currency), bg: [241, 245, 249], text: [15, 23, 42] },
    { label: "CONTRIBUTIONS", val: formatVal(data.summary.totalContributions, currency), bg: [236, 253, 245], text: [4, 120, 87] },
    { label: "SETTLEMENTS", val: formatVal(data.summary.totalSettlements, currency), bg: [239, 246, 255], text: [30, 64, 175] },
  ];

  let cardX = 14;
  cards.forEach((card) => {
    doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
    doc.rect(cardX, 42, 56, 20, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cardX + 5, 47);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(card.text[0], card.text[1], card.text[2]);
    doc.text(card.val, cardX + 5, 56);

    cardX += 63;
  });

  let currentY = 70;

  // Description
  if (data.description) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Description: ${data.description}`, 14, currentY);
    currentY += 8;
  }

  // 1. Member Contribution Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Member Contribution Summary", 14, currentY);
  currentY += 4;

  const memberHeaders = [["Member Name", "Email Address", "Contributed", "Share of Expense", "Balance"]];
  const memberRows = data.members.map((m: any) => [
    m.name,
    m.email,
    formatVal(m.contributed, currency),
    formatVal(m.share, currency),
    m.outstandingBalance === 0
      ? "Settled"
      : `${m.outstandingBalance > 0 ? "+" : ""}${formatVal(m.outstandingBalance, currency)}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: memberHeaders,
    body: memberRows,
    theme: "striped",
    headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: "bold" },
    styles: { fontSize: 8 },
    margin: { top: 26, left: 14, right: 14, bottom: 20 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 2. Category Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Category Spending Breakdown", 14, currentY);
  currentY += 4;

  const catHeaders = [["Category", "Total Spent", "Transactions Count", "Percentage"]];
  const catRows = data.categorySummary.map((c: any) => [
    c.category,
    formatVal(c.amount, currency),
    c.count,
    `${c.percentage.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: catHeaders,
    body: catRows,
    theme: "striped",
    headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: "bold" },
    styles: { fontSize: 8 },
    margin: { top: 26, left: 14, right: 14, bottom: 20 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 3. Detailed Expense Log
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Detailed Expense Log", 14, currentY);
  currentY += 4;

  const expHeaders = [["Date", "Description", "Category", "Paid By", "Split Breakdown", "Amount"]];
  const expRows = data.expenses.map((e: any) => [
    new Date(e.date).toLocaleDateString(),
    e.description,
    e.category,
    e.paidBy,
    e.splits.map((s: any) => `${s.name}: ${formatVal(s.amount, currency)}`).join("\n"),
    formatVal(e.amount, currency),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: expHeaders,
    body: expRows,
    theme: "striped",
    headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: "bold" },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    margin: { top: 26, left: 14, right: 14, bottom: 20 },
    columnStyles: {
      4: { cellWidth: 45 }, // Clean wrapping for split breakdowns
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Settlement details
  if (data.settlements.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Settlement Log", 14, currentY);
    currentY += 4;

    const setHeaders = [["Date", "Sender", "Recipient", "Amount"]];
    const setRows = data.settlements.map((s: any) => [
      new Date(s.date).toLocaleDateString(),
      s.from,
      s.to,
      formatVal(s.amount, currency),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: setHeaders,
      body: setRows,
      theme: "striped",
      headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: "bold" },
      styles: { fontSize: 8 },
      margin: { top: 26, left: 14, right: 14, bottom: 20 },
    });
  }

  // Draw header and footer on all pages
  await addHeaderFooter(doc, reportTitle);

  doc.save(`SpendClan_Group_${data.groupName.replace(/\s+/g, "_")}_Report.pdf`);
}
