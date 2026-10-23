/* eslint-disable @next/next/no-img-element -- profile photos are small data URLs, not optimisable assets */

export interface AvatarPerson {
  id: string;
  name: string;
  profilePhoto?: string | null;
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

const SIZES = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-xs", lg: "h-11 w-11 text-sm" } as const;

export function Avatar({ person, size = "md", className = "" }: { person: AvatarPerson; size?: keyof typeof SIZES; className?: string }) {
  const base = `${SIZES[size]} shrink-0 rounded-full ring-2 ring-[var(--card)] ${className}`;
  return person.profilePhoto ? (
    <img src={person.profilePhoto} alt="" title={person.name} className={`${base} object-cover`} />
  ) : (
    <span aria-hidden="true" title={person.name} className={`${base} inline-flex items-center justify-center bg-[var(--accent-dim)] font-semibold text-[var(--accent)]`}>
      {initials(person.name)}
    </span>
  );
}

/** Overlapping avatars with a "+N" for the rest. The names are given to screen readers as text. */
export function AvatarStack({ people, max = 4, size = "sm" }: { people: AvatarPerson[]; max?: number; size?: keyof typeof SIZES }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      <span className="sr-only">{people.map((p) => p.name).join(", ")}</span>
      <div className="flex -space-x-2" aria-hidden="true">
        {shown.map((p) => (
          <Avatar key={p.id} person={p} size={size} />
        ))}
        {rest > 0 && (
          <span className={`${SIZES[size]} inline-flex items-center justify-center rounded-full bg-[var(--surface)] font-semibold text-[var(--foreground-muted)] ring-2 ring-[var(--card)]`}>
            +{rest}
          </span>
        )}
      </div>
    </div>
  );
}
