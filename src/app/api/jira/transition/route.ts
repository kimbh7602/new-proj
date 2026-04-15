import { NextRequest, NextResponse } from "next/server";
import { getIssueTransitions, transitionIssue } from "@/lib/jira";

// GET: 가능한 상태 전환 목록
export async function GET(request: NextRequest) {
  const issueKey = request.nextUrl.searchParams.get("key");
  if (!issueKey) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  try {
    const transitions = await getIssueTransitions(issueKey);
    return NextResponse.json({ transitions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch transitions";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// POST: 상태 변경
export async function POST(request: NextRequest) {
  const { issue_key, transition_id } = (await request.json()) as {
    issue_key: string;
    transition_id: string;
  };

  if (!issue_key || !transition_id) {
    return NextResponse.json(
      { error: "issue_key and transition_id are required" },
      { status: 400 }
    );
  }

  try {
    await transitionIssue(issue_key, transition_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to transition issue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
