import { NextRequest, NextResponse } from "next/server";
import { getIssueDetail } from "@/lib/jira";

export async function GET(request: NextRequest) {
  const issueKey = request.nextUrl.searchParams.get("key");
  if (!issueKey) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  try {
    const issue = await getIssueDetail(issueKey);
    return NextResponse.json({ issue });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch issue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
