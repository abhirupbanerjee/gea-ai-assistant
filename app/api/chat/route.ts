import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

export async function POST(req: NextRequest) {
  try {
    const { message, threadId } = await req.json();
    const assistantId = process.env.OPENAI_ASSISTANT_ID;

    if (!assistantId || !message) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    let currentThreadId: string | undefined = threadId;

    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
    }

    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistantId,
    });

    const handlerUrl = new URL(req.url);
    handlerUrl.pathname = "/api/assistant/tool-handler";
    await fetch(handlerUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id: currentThreadId, run_id: run.id }),
    });

    let status = run.status;
    let retries = 0;
    const maxRetries = 10;

    while ((status === "in_progress" || status === "queued") && retries < maxRetries) {
      await new Promise((res) => setTimeout(res, 2000));
      const runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      status = runStatus.status;
      retries++;
    }

    let reply = "No response received.";
    if (status === "completed") {
      const messages = await openai.beta.threads.messages.list(currentThreadId);
      const assistantMsg = messages.data.find((m: any) => m.role === "assistant");
      reply =
        assistantMsg?.content?.[0]?.text?.value?.replace(/【\d+:\d+†[^】]+】/g, "") ||
        "No valid response.";
    }

    return NextResponse.json({ reply, threadId: currentThreadId });
  } catch (err: any) {
    console.error("Chat API error:", err.message);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
