import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const refCode = searchParams.get("ref");
  const next = searchParams.get("next") ?? "/exams";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Process referral if ref code is present
      if (refCode) {
        try {
          // Look up the referrer by their referral code
          const { data: referrer } = await supabase
            .from("profiles")
            .select("id")
            .eq("referral_code", refCode)
            .single();

          if (referrer && referrer.id !== data.user.id) {
            // Check if this user hasn't already been referred
            const { data: existingRef } = await supabase
              .from("referrals")
              .select("id")
              .eq("referred_id", data.user.id)
              .single();

            if (!existingRef) {
              // Create the referral record
              await supabase.from("referrals").insert({
                referrer_id: referrer.id,
                referred_id: data.user.id,
              });
            }
          }
        } catch {
          // Non-critical — referral processing failure shouldn't block auth
          console.error("Referral processing failed for code:", refCode);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
