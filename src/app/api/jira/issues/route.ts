import { NextRequest, NextResponse } from "next/server";
import { getBoardIssues } from "@/lib/jira";

export async function GET(request: NextRequest) {
  const boardId = request.nextUrl.searchParams.get("boardId");
  if (!boardId) {
    return NextResponse.json(
      { error: "boardId is required" },
      { status: 400 }
    );
  }

  try {
    const issues = await getBoardIssues(parseInt(boardId, 10));
    return NextResponse.json({ issues });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch issues";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
