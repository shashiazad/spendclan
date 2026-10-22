import { NextResponse } from "next/server";

/** Response for API endpoints of the retired personal-finance features. */
export function personalFeatureGone() {
  return NextResponse.json(
    {
      error:
        "Personal expenses, income, recurring and savings have been retired. SpendClan now focuses on group expenses. Download your personal data from Profile.",
    },
    { status: 410 },
  );
}
