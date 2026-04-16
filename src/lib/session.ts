/**
 * 세션 관리 — HTTP-only 쿠키로 user_id 저장.
 * Supabase users 테이블에서 Jira 토큰 조회.
 */

import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase";

const SESSION_COOKIE = "acc_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function setSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

interface JiraUser {
  id: string;
  email: string;
  jira_account_id: string | null;
  jira_access_token: string | null;
  jira_refresh_token: string | null;
  jira_token_expires_at: string | null;
  jira_cloud_id: string | null;
  jira_site_url: string | null;
}

export async function getCurrentUser(): Promise<JiraUser | null> {
  const userId = await getSession();
  if (!userId) return null;

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("users")
      .select(
        "id, email, jira_account_id, jira_access_token, jira_refresh_token, jira_token_expires_at, jira_cloud_id, jira_site_url"
      )
      .eq("id", userId)
      .single();

    return data as JiraUser | null;
  } catch {
    return null;
  }
}
