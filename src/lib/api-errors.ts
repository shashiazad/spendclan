export const NETWORK_ERROR =
  "Couldn't reach the server. Check your connection and try again. Your entry has been kept.";

/** Reads a user-facing message from a failed API response. */
export async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    const issue = Array.isArray(data?.details) ? data.details[0] : undefined;
    if (data?.error === "Validation failed" && issue?.message) {
      const field = Array.isArray(issue.path) && issue.path.length ? `${issue.path.join(".")}: ` : "";
      return `${field}${issue.message}`;
    }
    return data?.error ?? fallback;
  } catch {
    return fallback;
  }
}
