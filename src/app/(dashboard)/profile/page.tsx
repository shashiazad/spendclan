"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ProfilePage() {
  const { update, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    mobileNumber: string;
    currency: string;
    profilePhoto: string | null;
    createdAt: string;
  } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile details from API
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/users/profile")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to load profile");
        })
        .then((data) => {
          setProfile(data);
          setPreviewPhoto(data.profilePhoto);
        })
        .catch((err) => {
          console.error(err);
          setSaveError("Failed to fetch profile details.");
        });
    }
  }, [status]);

  if (status === "loading" || !profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Please select a valid image file.");
      return;
    }

    setSaveError(null);
    setSaveSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create 128x128 canvas
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Calculate source rectangle to crop square from center
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;

          ctx.drawImage(img, x, y, size, size, 0, 0, 128, 128);

          // Get optimized base64 string
          const base64 = canvas.toDataURL("image/jpeg", 0.8);
          setPreviewPhoto(base64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    setPreviewPhoto(null);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhoto: previewPhoto }),
      });

      if (res.ok) {
        // Update NextAuth local session
        await update({ profilePhoto: previewPhoto });
        
        setProfile((prev) => prev ? { ...prev, profilePhoto: previewPhoto } : null);
        setSaveSuccess(true);
      } else {
        const data = await res.json();
        setSaveError(data.error ?? "Failed to update profile photo.");
      }
    } catch (err) {
      console.error(err);
      setSaveError("An unexpected error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Profile Settings</h1>
        <p className="mt-1 text-slate-400">Manage your SpendClan avatar and view account details</p>
      </div>

      <Card>
        <CardHeader title="Account Profile" />
        <CardBody>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-800">
              <div className="relative">
                {previewPhoto ? (
                  <img
                    src={previewPhoto}
                    alt={profile.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/10"
                  />
                ) : (
                  <div className="flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-3xl border border-emerald-500/30">
                    {getInitials(profile.name)}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-300 text-center sm:text-left">
                  Profile Photo
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={triggerFileInput}
                  >
                    Upload Photo
                  </Button>
                  {previewPhoto && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleRemovePhoto}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500 text-center sm:text-left">
                  Supports JPEG, PNG. Resized to 128x128. Max 200KB.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Read-only Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Name
                </label>
                <div className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-400 select-none">
                  {profile.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-400 select-none">
                  {profile.email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Mobile Number
                </label>
                <div className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-400 select-none">
                  {profile.mobileNumber}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Primary Currency
                </label>
                <div className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-400 select-none">
                  {profile.currency}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Member Since
                </label>
                <div className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-400 select-none">
                  {new Date(profile.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Status alerts */}
            {saveSuccess && (
              <div className="p-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                Profile photo updated successfully!
              </div>
            )}
            {saveError && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                {saveError}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                loading={loading}
                disabled={previewPhoto === profile.profilePhoto}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
