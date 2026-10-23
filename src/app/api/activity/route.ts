import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { ACTIVITY_MAX_LIMIT, ActivityCursorError, getActivity } from "@/lib/activity";

const querySchema = z.object({
  groupId: z.string().uuid().optional(),
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(ACTIVITY_MAX_LIMIT).default(20),
});

/** GET /api/activity — newest-first events across your groups (or one group with ?groupId=). */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }
  try {
    return NextResponse.json(await getActivity(auth.session.user.id, parsed.data));
  } catch (error) {
    if (error instanceof ActivityCursorError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
