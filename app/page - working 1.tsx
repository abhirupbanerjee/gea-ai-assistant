"use client"; // Required for using state management in Next.js App Router

import React, { useState, useEffect } from "react";
import axios from "axios";

// Use environment variables for sensitive data
const ASSISTANT_ID = process.env.NEXT_PUBLIC_OPENAI_ASSISTANT_ID;
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const OPENAI_ORGANIZATION = process.env.NEXT_PUBLIC_OPENAI_ORGANIZATION;

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load stored chat history and threadId from localStorage (Persistent Chat)
  useEffect(() => {
    const storedMessages = JSON.parse(localStorage.getItem("chatHistory")) || [];
    const storedThread = localStorage.getItem("threadId");
    if (storedMessages.length > 0) {
      setMessages(storedMessages);
    }
    if (storedThread) {
      setThreadId(storedThread);
    }
  }, []);

  // Save chat history and threadId to localStorage
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
    if (threadId) {
      localStorage.setItem("threadId", threadId);
    }
  }, [messages, threadId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setLoading(true);
    const userMessage = { role: "user", content: input };
    // Add user's message to the UI
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    // Preserve the original input for the API call
    const userInput = input;
    setInput("");

    // Define headers with required beta header
    const headers = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2", // Required to access the Assistants API
    };

    // Optionally add the organization header if provided
    if (OPENAI_ORGANIZATION) {
      headers["OpenAI-Organization"] = OPENAI_ORGANIZATION;
    }

    try {
      let currentThreadId = threadId;

      // Step 1: Create a Thread if not already created
      if (!currentThreadId) {
        console.log("Creating a new thread...");
        const threadResponse = await axios.post(
          "https://api.openai.com/v1/threads",
          {},
          { headers }
        );
        currentThreadId = threadResponse.data.id;
        setThreadId(currentThreadId);
        console.log("Thread created:", currentThreadId);
      }

      // Step 2: Add the User Message to the Thread
      console.log("Adding user message to thread:", currentThreadId);
      await axios.post(
        `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
        { role: "user", content: userInput },
        { headers }
      );

      // Step 3: Run the Assistant on the Thread
      console.log("Running assistant...");
      const runResponse = await axios.post(
        `https://api.openai.com/v1/threads/${currentThreadId}/runs`,
        { assistant_id: ASSISTANT_ID },
        { headers }
      );
      const runId = runResponse.data.id;
      console.log("Run ID:", runId);

      // Step 4: Poll for Assistant's Response
      let runStatus = "in_progress";
      let retries = 0;
      const maxRetries = 10;
      let assistantReply = "No response received.";

      while (
        (runStatus === "in_progress" || runStatus === "queued") &&
        retries < maxRetries
      ) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before checking
        const statusResponse = await axios.get(
          `https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`,
          { headers }
        );
        runStatus = statusResponse.data.status;
        console.log("Run status:", runStatus);
        retries++;
      }

      // Step 5: Retrieve Assistant's Message if Run Completed
      if (runStatus === "completed") {
        console.log("Fetching assistant response...");
        const messagesResponse = await axios.get(
          `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
          { headers }
        );
        const lastMessage = messagesResponse.data.data.find(
          (msg) => msg.role === "assistant"
        );
        assistantReply = lastMessage
          ? lastMessage.content[0].text.value
          : "No response received.";
      } else {
        assistantReply = "Assistant response timed out.";
      }

      // Step 6: Update Chat Messages with Assistant's Reply
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: assistantReply },
      ]);
    } catch (error) {
      console.error("Error:", error);
      let errorMessage = "Error connecting to assistant. Try again later.";
      if (error.response && error.response.data) {
        errorMessage = `Error: ${error.response.data.message || error.response.status}`;
      }
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold text-center">GEA Chatbot</h2>

      <div className="h-64 overflow-y-auto border p-3 space-y-2">
        {messages.map((msg, index) => (
          <p key={index} className={msg.role === "user" ? "text-blue-600" : "text-green-600"}>
            <b>{msg.role === "user" ? "You" : "GEA Bot"}:</b> {msg.content}
          </p>
        ))}
      </div>

      {loading && <p className="text-gray-500 text-center">Thinking...</p>}

      <input
        className="border rounded p-2 w-full mt-2"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
      />
      <button
        className="bg-blue-500 text-white p-2 rounded mt-2 w-full"
        onClick={sendMessage}
        disabled={loading}
      >
        {loading ? "Waiting..." : "Send"}
      </button>

      <button
        className="bg-red-500 text-white p-2 rounded mt-2 w-full"
        onClick={() => {
          setMessages([]);
          setThreadId(null);
          localStorage.removeItem("chatHistory");
          localStorage.removeItem("threadId");
        }}
      >
        Clear Chat
      </button>
    </div>
  );
}
