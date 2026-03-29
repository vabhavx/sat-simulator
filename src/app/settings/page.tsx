"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/animations";

interface ProfileData {
  fullName: string;
  testDate: string;
  dateOfBirth: string;
  country: string;
  targetScore: string;
  school: string;
  grade: string;
  studyHoursPerWeek: string;
  parentEmail: string;
}

const PROFILE_KEY = "fudsat_profile";

const COUNTRIES = [
  "United States", "India", "United Kingdom", "Canada", "Australia",
  "Nigeria", "Pakistan", "Philippines", "South Korea", "China",
  "Brazil", "Mexico", "Germany", "France", "Japan", "Indonesia",
  "Turkey", "Saudi Arabia", "United Arab Emirates", "Egypt",
  "South Africa", "Kenya", "Bangladesh", "Vietnam", "Thailand",
  "Malaysia", "Singapore", "Netherlands", "Italy", "Spain",
  "Other",
];

const GRADES = [
  "8th Grade", "9th Grade (Freshman)", "10th Grade (Sophomore)",
  "11th Grade (Junior)", "12th Grade (Senior)",
  "Gap Year", "Other",
];

function loadProfile(): ProfileData {
  if (typeof window === "undefined") return getDefault();
  const data = localStorage.getItem(PROFILE_KEY);
  if (!data) return getDefault();
  return { ...getDefault(), ...JSON.parse(data) };
}

function getDefault(): ProfileData {
  return {
    fullName: "",
    testDate: "",
    dateOfBirth: "",
    country: "",
    targetScore: "",
    school: "",
    grade: "",
    studyHoursPerWeek: "",
    parentEmail: "",
  };
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function SettingsPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(getDefault());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = loadProfile();
    if (user?.user_metadata?.full_name && !stored.fullName) {
      stored.fullName = user.user_metadata.full_name;
    }
    setProfile(stored);
    setLoaded(true);
  }, [user]);

  if (authLoading || !loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <LoadingSpinner size={32} />
          <p className="text-[var(--text-secondary)]">Loading settings...</p>
        </motion.div>
      </div>
    );
  }

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    if (user && profile.fullName) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { full_name: profile.fullName },
        });
      } catch {
        // Silently continue — profile is saved locally regardless
      }
    }

    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto px-6 py-8"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Nav */}
      <motion.div
        className="flex items-center justify-between mb-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
          >
            ← Dashboard
          </a>
          <span className="text-sm text-[var(--text-secondary)]">/</span>
          <span className="text-sm font-medium">Settings</span>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">{user.email}</span>
            <button
              onClick={signOut}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--incorrect)] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </motion.div>

      {/* Header */}
      <motion.div className="mb-8" variants={staggerItem}>
        <h1 className="text-2xl font-semibold mb-1">Account Settings</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage your profile and preferences
        </p>
      </motion.div>

      {/* Avatar & Email */}
      <motion.div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-6"
        variants={staggerItem}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xl font-semibold shrink-0">
            {profile.fullName
              ? profile.fullName.charAt(0).toUpperCase()
              : user?.email?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">
              {profile.fullName || "Set your name below"}
            </p>
            <p className="text-sm text-[var(--text-secondary)] truncate">{user?.email}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Joined {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Personal Information */}
      <motion.div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-6"
        variants={staggerItem}
      >
        <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-5 uppercase tracking-wide">
          Personal Information
        </h2>
        <div className="space-y-5">
          <Field
            label="Full Name"
            required
            value={profile.fullName}
            onChange={(v) => handleChange("fullName", v)}
            placeholder="Your full name"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Date of Birth"
              type="date"
              optional
              value={profile.dateOfBirth}
              onChange={(v) => handleChange("dateOfBirth", v)}
            />
            <SelectField
              label="Country"
              value={profile.country}
              onChange={(v) => handleChange("country", v)}
              options={COUNTRIES}
              placeholder="Select country"
            />
          </div>
        </div>
      </motion.div>

      {/* SAT Preparation */}
      <motion.div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-6"
        variants={staggerItem}
      >
        <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-5 uppercase tracking-wide">
          SAT Preparation
        </h2>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="SAT Test Date"
              type="date"
              value={profile.testDate}
              onChange={(v) => handleChange("testDate", v)}
            />
            <Field
              label="Target Score"
              type="number"
              value={profile.targetScore}
              onChange={(v) => handleChange("targetScore", v)}
              placeholder="e.g. 1500"
              min={400}
              max={1600}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Grade"
              optional
              value={profile.grade}
              onChange={(v) => handleChange("grade", v)}
              options={GRADES}
              placeholder="Select grade"
            />
            <Field
              label="Study Hours / Week"
              type="number"
              optional
              value={profile.studyHoursPerWeek}
              onChange={(v) => handleChange("studyHoursPerWeek", v)}
              placeholder="e.g. 10"
              min={0}
              max={80}
            />
          </div>
          <Field
            label="School"
            optional
            value={profile.school}
            onChange={(v) => handleChange("school", v)}
            placeholder="Your school or institution"
          />
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-8"
        variants={staggerItem}
      >
        <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-5 uppercase tracking-wide">
          Optional
        </h2>
        <Field
          label="Parent / Guardian Email"
          type="email"
          optional
          value={profile.parentEmail}
          onChange={(v) => handleChange("parentEmail", v)}
          placeholder="For progress reports (optional)"
        />
      </motion.div>

      {/* Save Button */}
      <motion.div className="flex items-center gap-4" variants={staggerItem}>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--accent)] text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 disabled:opacity-60"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size={14} />
              Saving...
            </span>
          ) : (
            "Save Changes"
          )}
        </motion.button>
        <AnimatePresence>
          {saved && (
            <motion.span
              className="text-sm text-[var(--correct)] font-medium"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              Changes saved
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        className="mt-12 pt-8 border-t border-[var(--border)]"
        variants={staggerItem}
      >
        <h2 className="text-sm font-medium text-[var(--incorrect)] mb-3 uppercase tracking-wide">
          Danger Zone
        </h2>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Permanently remove your account and all associated data
            </p>
          </div>
          <button className="text-xs text-[var(--incorrect)] border border-[var(--incorrect)]/30 px-4 py-2 rounded-lg hover:bg-[var(--incorrect)]/10 transition-colors font-medium">
            Delete Account
          </button>
        </div>
      </motion.div>

      <div className="h-12" />
    </motion.div>
  );
}

/* ─── Form Components ─── */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  optional,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  optional?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
        {label}
        {optional && (
          <span className="text-[var(--text-secondary)]/60 font-normal ml-1">
            (optional)
          </span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)]/50 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all duration-200"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
        {label}
        {optional && (
          <span className="text-[var(--text-secondary)]/60 font-normal ml-1">
            (optional)
          </span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all duration-200 appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
