// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getFunctionDefinitions } from '@/lib/openai-functions';
import { handleFunctionCall, formatFunctionResult } from '@/lib/function-handlers';

// Server-side environment variables (no NEXT_PUBLIC_ prefix)
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ORGANIZATION = process.env.OPENAI_ORGANIZATION;

export async function POST(request: NextRequest) {
  try {
    // Log environment variables (don't log the actual keys in production)
    console.log('Environment check:', {
      hasAssistantId: !!ASSISTANT_ID,
      hasApiKey: !!OPENAI_API_KEY,
      hasOrganization: !!OPENAI_ORGANIZATION
    });

    if (!ASSISTANT_ID || !OPENAI_API_KEY) {
      console.error('Missing OpenAI configuration');
      return NextResponse.json(
        { error: 'Missing OpenAI configuration' },
        { status: 500 }
      );
    }

    const { message, threadId, sourceUrl, contextDescription } = await request.json();

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('Chat request:', {
      messageLength: message.length,
      hasThread: !!threadId,
      sourceUrl: sourceUrl || 'none',
      hasContext: !!contextDescription
    });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    };

    if (OPENAI_ORGANIZATION) {
      headers['OpenAI-Organization'] = OPENAI_ORGANIZATION;
    }

    let currentThreadId = threadId;

    // Create thread if it doesn't exist
    if (!currentThreadId) {
      console.log('Creating new thread...');
      try {
        const threadRes = await axios.post(
          'https://api.openai.com/v1/threads',
          {},
          { headers }
        );
        currentThreadId = threadRes.data.id;
        console.log('Thread created:', currentThreadId);
      } catch (error: any) {
        console.error('Thread creation failed:', error.response?.data || error.message);
        return NextResponse.json(
          { error: 'Failed to create thread' },
          { status: 500 }
        );
      }
    }

    // Add message to thread
    console.log('Adding message to thread...');
    try {
      await axios.post(
        `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
        { role: 'user', content: message },
        { headers }
      );
      console.log('Message added to thread');
    } catch (error: any) {
      console.error('Failed to add message:', error.response?.data || error.message);
      return NextResponse.json(
        { error: 'Failed to add message to thread' },
        { status: 500 }
      );
    }

    // Create run with function calling support
    console.log('Creating run...');
    let runId;
    try {
      // Build run request body
      const runBody: any = {
        assistant_id: ASSISTANT_ID,
        tools: getFunctionDefinitions(),
      };

      // Add additional instructions with context
      if (contextDescription) {
        // Full context description from postMessage
        runBody.additional_instructions = `## CURRENT USER CONTEXT\n\n${contextDescription}\n\n---\n\nUse this context to provide relevant, specific assistance.\nIf a modal is open, focus on that item.\nIf user is editing, help with the editable fields.\nIf on a specific tab, focus on that tab's content.\nIf in a form, guide through remaining steps.\n\nYou can also use the get_page_context function to get detailed page information if needed.`;
      } else if (sourceUrl) {
        // Fallback: just the route
        runBody.additional_instructions = `The user is currently viewing this page: ${sourceUrl}\n\nIf the user asks about the current page, what they can do, or needs help with a task, use the get_page_context function with this route to provide accurate, page-specific guidance.`;
      }

      const runRes = await axios.post(
        `https://api.openai.com/v1/threads/${currentThreadId}/runs`,
        runBody,
        { headers }
      );
      runId = runRes.data.id;
      console.log('Run created:', runId);
    } catch (error: any) {
      console.error('Run creation failed:', error.response?.data || error.message);
      return NextResponse.json(
        { error: 'Failed to create run' },
        { status: 500 }
      );
    }

    // Poll for completion with function calling support
    let status = 'in_progress';
    let retries = 0;
    const maxRetries = 60; // Increase timeout for function calls

    while ((status === 'in_progress' || status === 'queued' || status === 'requires_action') && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const statusRes = await axios.get(
          `https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`,
          { headers }
        );

        const runData = statusRes.data;
        status = runData.status;
        console.log(`Run status: ${status} (attempt ${retries + 1})`);

        // Handle function calls
        if (status === 'requires_action') {
          const toolCalls = runData.required_action?.submit_tool_outputs?.tool_calls || [];
          console.log(`Processing ${toolCalls.length} function call(s)`);

          // Execute all function calls
          const toolOutputs = await Promise.all(
            toolCalls.map(async (toolCall: any) => {
              const functionName = toolCall.function.name;
              const functionArgs = JSON.parse(toolCall.function.arguments);

              console.log(`Executing function: ${functionName}`, functionArgs);

              // Execute the function
              const result = await handleFunctionCall(functionName, functionArgs);
              const output = formatFunctionResult(result);

              console.log(`Function ${functionName} result:`, result.success ? 'success' : 'failed');

              return {
                tool_call_id: toolCall.id,
                output,
              };
            })
          );

          // Submit tool outputs back to OpenAI
          console.log('Submitting tool outputs...');
          try {
            await axios.post(
              `https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}/submit_tool_outputs`,
              { tool_outputs: toolOutputs },
              { headers }
            );
            console.log('Tool outputs submitted successfully');
          } catch (error: any) {
            console.error('Failed to submit tool outputs:', error.response?.data || error.message);
            status = 'failed';
            break;
          }
        }

        if (status === 'failed' || status === 'cancelled' || status === 'expired') {
          console.error('Run failed:', runData.last_error || 'Unknown error');
          break;
        }
      } catch (error: any) {
        console.error('Status check failed:', error.response?.data || error.message);
        break;
      }

      retries++;
    }

    let reply = 'No response received.';
    
    if (status === 'completed') {
      console.log('Run completed, fetching messages...');
      try {
        const messagesRes = await axios.get(
          `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
          { headers }
        );
        
        const assistantMsg = messagesRes.data.data.find((m: any) => m.role === 'assistant');
        let rawReply = assistantMsg?.content?.[0]?.text?.value || 'No valid response.';

        // Clean up OpenAI citations and references
        reply = rawReply
          .replace(/【\d+:\d+†[^】]+】/g, '') // Remove citation markers like 【4:0†source】
          .replace(/\n\nReferences:[\s\S]*$/g, '') // Remove "References:" section at the end
          .trim();

        // Remove code fences if entire response is wrapped in them
        // Match: ```optional-language\ncontent\n```
        const codeFencePattern = /^```[a-z]*\n([\s\S]*?)\n```$/;
        if (codeFencePattern.test(reply)) {
          reply = reply.replace(codeFencePattern, '$1').trim();
        }

        console.log('Reply extracted and cleaned successfully');
      } catch (error: any) {
        console.error('Failed to fetch messages:', error.response?.data || error.message);
        reply = 'Failed to fetch response.';
      }
    } else if (status === 'failed') {
      reply = 'The assistant run failed. Please try again.';
    } else if (retries >= maxRetries) {
      reply = 'The assistant is taking too long to respond. Please try again.';
    }

    return NextResponse.json({
      reply,
      threadId: currentThreadId,
      status: 'success'
    });

  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    
    let errorMessage = 'Unable to reach assistant.';
    
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid API key.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Assistant not found.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}