import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  getAccessibleResources,
  getMe,
} from "@/lib/jira-oauth";
import { setSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("oauth_state")?.value;

  // CSRF check
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(
      new URL("/?error=invalid_state", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user info
    const me = await getMe(tokens.access_token);

    // Get accessible Jira sites
    const resources = await getAccessibleResources(tokens.access_token);
    const site = resources[0]; // Use first available site

    if (!site) {
      return NextResponse.redirect(
        new URL("/?error=no_jira_site", request.url)
      );
    }

    // Upsert user in Supabase
    const supabase = createServiceClient();
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", me.email)
      .single();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await supabase
        .from("users")
        .update({
          jira_account_id: me.account_id,
          jira_access_token: tokens.access_token,
          jira_refresh_token: tokens.refresh_token,
          jira_token_expires_at: expiresAt,
          jira_cloud_id: site.id,
          jira_site_url: site.url,
        })
        .eq("id", userId);
    } else {
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          email: me.email,
          jira_account_id: me.account_id,
          jira_access_token: tokens.access_token,
          jira_refresh_token: tokens.refresh_token,
          jira_token_expires_at: expiresAt,
          jira_cloud_id: site.id,
          jira_site_url: site.url,
        })
        .select("id")
        .single();

      userId = newUser!.id;
    }

    // Set session cookie
    await setSession(userId);

    // Clear OAuth state cookie and redirect
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("oauth_state");
    return response;
  } catch (error) {
    console.error("Jira OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }
}
