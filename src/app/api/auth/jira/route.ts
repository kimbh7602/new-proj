import { NextResponse } from "next/server";
import { getAuthorizeUrl } from "@/lib/jira-oauth";

export async function GET() {
  // Generate random state for CSRF protection
  const state = crypto.randomUUID();

  const response = NextResponse.redirect(getAuthorizeUrl(state));

  // Store state in cookie for verification in callback
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
