"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface ReferralStatus {
  referralCode: string | null;
  referralCount: number;
  isUnlocked: boolean;
  referralLink: string;
  loading: boolean;
  referrals: { id: string; email: string; created_at: string }[];
  refresh: () => Promise<void>;
}

const REQUIRED_REFERRALS = 6;
const SITE_DOMAIN = "https://johnlick.com";

export function useReferral(): ReferralStatus {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<{ id: string; email: string; created_at: string }[]>([]);

  const fetchReferralStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Fetch profile with referral info
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, referral_count, is_unlocked")
      .eq("id", user.id)
      .single();

    if (profile) {
      setReferralCode(profile.referral_code);
      setReferralCount(profile.referral_count ?? 0);
      setIsUnlocked(profile.is_unlocked ?? false);
    }

    // Fetch referral details
    const { data: refs } = await supabase
      .from("referrals")
      .select("id, created_at, referred_id")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (refs && refs.length > 0) {
      // Get referred user profiles
      const referredIds = refs.map((r: { referred_id: string }) => r.referred_id);
      const { data: referredProfiles } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", referredIds);

      const profileMap = new Map(
        (referredProfiles || []).map((p: { id: string; email: string; display_name: string }) => [p.id, p])
      );

      setReferrals(
        refs.map((r: { id: string; referred_id: string; created_at: string }) => ({
          id: r.id,
          email: profileMap.get(r.referred_id)?.email || "Anonymous",
          created_at: r.created_at,
        }))
      );
    } else {
      setReferrals([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchReferralStatus();
  }, [fetchReferralStatus]);

  const referralLink = referralCode
    ? `${SITE_DOMAIN}/auth/signup?ref=${referralCode}`
    : "";

  return {
    referralCode,
    referralCount: Math.min(referralCount, REQUIRED_REFERRALS),
    isUnlocked,
    referralLink,
    loading,
    referrals,
    refresh: fetchReferralStatus,
  };
}

export { REQUIRED_REFERRALS, SITE_DOMAIN };
