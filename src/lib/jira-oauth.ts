/**
 * Jira OAuth 2.0 (3LO) 헬퍼.
 *
 * Flow:
 *   1. /api/auth/jira → Atlassian authorize URL로 리다이렉트
 *   2. 유저 승인 → /api/auth/jira/callback 으로 code 수신
 *   3. code → access_token + refresh_token 교환
 *   4. accessible-resources → cloud_id 조회
 *   5. Supabase users 테이블에 토큰 저장
 */

const ATLASSIAN_AUTH_URL = "https://auth.atlassian.com/authorize";
const ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const ATLASSIAN_RESOURCES_URL =
  "https://api.atlassian.com/oauth/token/accessible-resources";
const ATLASSIAN_ME_URL = "https://api.atlassian.com/me";

const CLIENT_ID = process.env.JIRA_OAUTH_CLIENT_ID || "";
const CLIENT_SECRET = process.env.JIRA_OAUTH_CLIENT_SECRET || "";

function getCallbackUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  return `${base}/api/auth/jira/callback`;
}

export function getAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: CLIENT_ID,
    scope:
      "read:jira-work write:jira-work read:jira-user offline_access read:me",
    redirect_uri: getCallbackUrl(),
    state,
    response_type: "code",
    prompt: "consent",
  });
  return `${ATLASSIAN_AUTH_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<TokenResponse> {
  const res = await fetch(ATLASSIAN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: getCallbackUrl(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch(ATLASSIAN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${err}`);
  }

  return res.json();
}

interface CloudResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
}

export async function getAccessibleResources(
  accessToken: string
): Promise<CloudResource[]> {
  const res = await fetch(ATLASSIAN_RESOURCES_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Resources fetch failed: ${res.status}`);
  return res.json();
}

interface AtlassianUser {
  account_id: string;
  email: string;
  name: string;
  picture: string;
}

export async function getMe(accessToken: string): Promise<AtlassianUser> {
  const res = await fetch(ATLASSIAN_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Me fetch failed: ${res.status}`);
  return res.json();
}
