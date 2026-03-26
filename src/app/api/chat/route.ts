import { NextRequest, NextResponse } from "next/server";
import { ChatRequest, ChatResponse } from "@/lib/types";
import { handleUserMessage } from "@/lib/agent/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();

    if (!body.message && !body.approval_response) {
      return NextResponse.json(
        { error: "Message or approval_response is required" },
        { status: 400 }
      );
    }

    const userId = body.user_id || "usr_1";

    const response: ChatResponse = await handleUserMessage(
      body.message || "",
      userId,
      body.approval_response,
      body.pending_purchase_id
    );

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
