import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sendEmail } from "@/functions/email";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { thread_id, run_id } = await req.json();

    if (!thread_id || !run_id) {
      return NextResponse.json({ error: "Missing thread_id or run_id" }, { status: 400 });
    }

    const runStatus = await openai.beta.threads.runs.retrieve(thread_id, run_id);

    if (runStatus.status !== "requires_action") {
      return NextResponse.json({ status: "no_action_needed" });
    }

    const toolCalls = runStatus.required_action?.submit_tool_outputs.tool_calls || [];

    const outputs = [];

    for (const toolCall of toolCalls) {
      const fn = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      if (fn === "sendEmail") {
        const result = await sendEmail(args);
        outputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify(result),
        });
      } else {
        outputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify({ error: `Unknown tool: ${fn}` }),
        });
      }
    }

    await openai.beta.threads.runs.submitToolOutputs(thread_id, run_id, {
      tool_outputs: outputs,
    });

    return NextResponse.json({ status: "tools_executed", result: outputs });
  } catch (err: any) {
    console.error("Tool handler error:", err.message);
    return NextResponse.json({ error: "Internal error", details: err.message }, { status: 500 });
  }
}
