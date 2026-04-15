import { NextResponse } from "next/server";
import { getBoards } from "@/lib/jira";

export async function GET() {
  try {
    const boards = await getBoards();
    return NextResponse.json({ boards });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch boards";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
