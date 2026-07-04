"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "./Input";

export interface SelectedMember {
  id?: string;
  name?: string;
  email: string;
  profilePhoto?: string | null;
  isInvite?: boolean;
}

interface MemberSearchProps {
  selectedMembers: SelectedMember[];
  onAddMember: (member: SelectedMember) => void;
  onRemoveMember: (email: string) => void;
  placeholder?: string;
  excludeEmails?: string[];
  singleSelect?: boolean;
}

export function MemberSearch({
  selectedMembers,
  onAddMember,
  onRemoveMember,
  placeholder = "Search by name or email...",
  excludeEmails = [],
  singleSelect = false,
}: MemberSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            profilePhoto: u.profilePhoto,
          }));
          setResults(mapped);
        }
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSelect = (member: SelectedMember) => {
    onAddMember(member);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  // Filter out already selected or excluded members
  const selectedEmails = new Set(selectedMembers.map((m) => m.email.toLowerCase()));
  const allExcludeEmails = new Set([...excludeEmails.map(e => e.toLowerCase()), ...selectedEmails]);

  const filteredResults = results.filter(
    (r) => !allExcludeEmails.has(r.email.toLowerCase())
  );

  const showInviteOption =
    isEmail(query) &&
    !allExcludeEmails.has(query.toLowerCase()) &&
    !results.some((r) => r.email.toLowerCase() === query.toLowerCase());

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected member chips */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedMembers.map((member) => (
            <div
              key={member.email}
              className="flex items-center gap-1.5 bg-[var(--sidebar-hover)] border border-[var(--border)] rounded-full pl-1.5 pr-2.5 py-1 text-xs text-[var(--foreground)]"
            >
              {member.profilePhoto ? (
                <img
                  src={member.profilePhoto}
                  alt={member.name || member.email}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-bold text-[10px] border border-[var(--accent)]/10">
                  {member.name ? getInitials(member.name) : "?"}
                </div>
              )}
              <div className="max-w-[120px] truncate">
                {member.name || member.email}
              </div>
              {member.isInvite && (
                <span className="text-[9px] px-1 bg-[var(--accent-dim)] text-[var(--accent)] rounded border border-[var(--accent)]/20">
                  Invite
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemoveMember(member.email)}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors ml-0.5 focus:outline-none"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      {(!singleSelect || selectedMembers.length === 0) && (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="pr-10"
          />
          {loading && (
            <div className="absolute right-3 top-3.5">
              <svg
                className="animate-spin h-5 w-5 text-emerald-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && (query.trim().length >= 2 || showInviteOption) && (
        <div className="absolute z-50 w-full mt-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] max-h-60 overflow-y-auto">
          {filteredResults.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelect(user)}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[var(--sidebar-hover)] text-left transition-colors border-b border-[var(--border)] last:border-0"
            >
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-[var(--border)]"
                />
              ) : (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-semibold text-xs border border-[var(--accent)]/20">
                  {user.name ? getInitials(user.name) : "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">
                  {user.name}
                </p>
                <p className="text-xs text-[var(--foreground-muted)] truncate">{user.email}</p>
              </div>
            </button>
          ))}

          {showInviteOption && (
            <button
              type="button"
              onClick={() =>
                handleSelect({
                  email: query.trim().toLowerCase(),
                  isInvite: true,
                })
              }
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[var(--accent-dim)] text-left transition-colors text-[var(--accent)] font-medium border-t border-[var(--border)]"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] text-sm font-bold border border-[var(--accent)]/20">
                +
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">Invite email to SpendClan</p>
                <p className="text-xs text-[var(--foreground-muted)] truncate">{query}</p>
              </div>
            </button>
          )}

          {filteredResults.length === 0 && !showInviteOption && (
            <div className="px-4 py-3 text-sm text-[var(--foreground-muted)]">
              No matching registered users found.
              {query.length > 0 && !isEmail(query) && (
                <p className="text-xs text-[var(--foreground-subtle)] mt-1">
                  Type a full valid email address to invite them.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
