"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CURRENCIES, SECURITY_QUESTIONS } from "@/lib/constants";

export default function ProfilePage() {
  const { update, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    mobileNumber: string;
    currency: string;
    profilePhoto: string | null;
    securityQuestion?: string;
    hasPassword?: boolean;
    hasSecurityQA?: boolean;
    createdAt: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

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
          setName(data.name || "");
          setMobileNumber(data.mobileNumber || "");
          setCurrency(data.currency || "INR");
          setSecurityQuestion(data.securityQuestion || "");
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

    // Basic Validation
    if (name.trim().length < 2) {
      setSaveError("Name must be at least 2 characters long.");
      setLoading(false);
      return;
    }

    if (mobileNumber && (mobileNumber.trim().length < 8 || mobileNumber.trim().length > 20)) {
      setSaveError("Mobile number must be between 8 and 20 digits.");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        profilePhoto: previewPhoto,
        name: name.trim(),
        mobileNumber: mobileNumber.trim() || null,
        currency,
      };

      if (password) {
        if (password.length < 8) {
          setSaveError("Password must be at least 8 characters long.");
          setLoading(false);
          return;
        }
        payload.password = password;
      }

      if (securityQuestion || securityAnswer) {
        if (!securityQuestion || !securityAnswer) {
          setSaveError("Both security question and security answer are required to save verification details.");
          setLoading(false);
          return;
        }
        payload.securityQuestion = securityQuestion;
        payload.securityAnswer = securityAnswer;
      }

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Update NextAuth local session
        await update({
          profilePhoto: previewPhoto,
          currency: currency,
          name: name.trim()
        });
        
        // Reset password/security inputs
        setPassword("");
        setSecurityAnswer("");
        
        setProfile({
          ...data.user,
          hasPassword: data.user.hashedPassword !== null,
          hasSecurityQA: data.user.securityQuestion !== null,
          securityQuestion: data.user.securityQuestion || "",
        });
        setSaveSuccess(true);
      } else {
        const data = await res.json();
        setSaveError(data.error ?? "Failed to update profile details.");
      }
    } catch (err) {
      console.error(err);
      setSaveError("An unexpected error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  const isDirty =
    name !== (profile.name || "") ||
    mobileNumber !== (profile.mobileNumber || "") ||
    currency !== (profile.currency || "") ||
    previewPhoto !== profile.profilePhoto ||
    !!password ||
    securityQuestion !== (profile.securityQuestion || "") ||
    !!securityAnswer;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Profile Settings</h1>
        <p className="mt-1 text-slate-400">Manage your SpendClan details and account credentials</p>
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
                    alt={name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/10"
                  />
                ) : (
                  <div className="flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-3xl border border-emerald-500/30">
                    {getInitials(name || profile.name)}
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

            {/* Editable Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-500 select-none cursor-not-allowed">
                  {profile.email} (Linked)
                </div>
              </div>

              <Input
                label="Mobile Number"
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+919876543210"
              />

              <Select
                label="Primary Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </div>

            {/* Security Section */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-200">Security & Credentials</h3>
                {!profile.hasPassword ? (
                  <p className="mt-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                    💡 You logged in using a Google Account. Set a password and security question below to also enable standard mobile/email credentials-based sign-in.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    Set a new password or change your security questions for credentials-based recovery.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={profile.hasPassword ? "Change Password" : "Set Password"}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                />

                <div className="hidden sm:block"></div>

                <Select
                  label="Security Question"
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  options={[
                    { value: "", label: "Select a question (optional)" },
                    ...SECURITY_QUESTIONS.map((q) => ({ value: q, label: q }))
                  ]}
                />

                <Input
                  label="Security Answer"
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder={profile.hasSecurityQA ? "Change security answer" : "Set security answer"}
                />
              </div>
            </div>

            {/* Status alerts */}
            {saveSuccess && (
              <div className="p-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                Profile updated successfully!
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
                disabled={!isDirty}
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
