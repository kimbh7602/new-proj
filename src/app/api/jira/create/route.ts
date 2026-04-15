import { NextRequest, NextResponse } from "next/server";
import { createIssue } from "@/lib/jira";

export async function POST(request: NextRequest) {
  const { project_key, summary, description, labels } = (await request.json()) as {
    project_key: string;
    summary: string;
    description?: string;
    labels?: string[];
  };

  if (!project_key || !summary) {
    return NextResponse.json(
      { error: "project_key and summary are required" },
      { status: 400 }
    );
  }

  try {
    const issue = await createIssue(project_key, summary, description, labels);
    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create issue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
