"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

// Environment variables
const ASSISTANT_ID = process.env.NEXT_PUBLIC_OPENAI_ASSISTANT_ID;
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const OPENAI_ORGANIZATION = process.env.NEXT_PUBLIC_OPENAI_ORGANIZATION;

interface Message {
  role: string;
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to latest message
  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load chat history & threadId from localStorage
  useEffect(() => {
    const storedMessages = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    const storedThread = localStorage.getItem("threadId");
    if (storedMessages.length > 0) setMessages(storedMessages);
    if (storedThread) setThreadId(storedThread);
  }, []);

  // Save chat history & threadId to localStorage
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
    if (threadId) localStorage.setItem("threadId", threadId);
  }, [messages, threadId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setLoading(true);
    const userMessage = { role: "user", content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    const userInput = input;
    setInput("");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
    };

    if (OPENAI_ORGANIZATION) {
      headers["OpenAI-Organization"] = OPENAI_ORGANIZATION;
    }

    try {
      let currentThreadId = threadId;

      // Create a Thread if not already created
      if (!currentThreadId) {
        const threadResponse = await axios.post("https://api.openai.com/v1/threads", {}, { headers });
        currentThreadId = threadResponse.data.id;
        setThreadId(currentThreadId);
      }

      // Add User Message to Thread
      await axios.post(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, { role: "user", content: userInput }, { headers });

      // Run Assistant on Thread
      const runResponse = await axios.post(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, { assistant_id: ASSISTANT_ID }, { headers });
      const runId = runResponse.data.id;

      // Poll for Assistant's Response
      let runStatus = "in_progress";
      let retries = 0;
      const maxRetries = 10;
      let assistantReply = "No response received.";

      while ((runStatus === "in_progress" || runStatus === "queued") && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const statusResponse = await axios.get(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, { headers });
        runStatus = statusResponse.data.status;
        retries++;
      }

      // Retrieve Assistant's Response
      if (runStatus === "completed") {
        const messagesResponse = await axios.get(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, { headers });
        const lastMessage = messagesResponse.data.data.find((msg: any) => msg.role === "assistant");
        assistantReply = lastMessage ? lastMessage.content[0].text.value : "No response received.";
      } else {
        assistantReply = "Assistant response timed out.";
      }

      // Update Chat Messages with Assistant's Reply
      setMessages((prevMessages) => [...prevMessages, { role: "assistant", content: assistantReply }]);
    } catch (error: any) {
      console.error("Error:", error);
      let errorMessage = "Error connecting to assistant. Try again later.";
      if (error.response && error.response.data) {
        errorMessage = `Error: ${error.response.data.message || error.response.status}`;
      }
      setMessages((prevMessages) => [...prevMessages, { role: "assistant", content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center bg-white">
      {/* Header with Custom Icon */}
      <header className="flex items-center justify-center w-full p-4 bg-white shadow-md">
        <img src="/gea-icon.png" alt="GEA Icon" className="h-16 w-16" />
        <h2 className="text-2xl font-bold ml-2">GEA AI Assistant</h2>
      </header>

      {/* Chat Container - Full Page, Resizable */}
      <div className="flex-grow w-full max-w-4xl p-4">
        <div
          ref={chatContainerRef}
          className="h-[70vh] sm:h-[75vh] overflow-y-auto border p-3 space-y-2 bg-white shadow rounded-lg"
        >
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`p-3 rounded-md ${
                msg.role === "user" ? "bg-gray-200 text-black" : "bg-white text-black border"
              }`}
            >
              <b>{msg.role === "user" ? "You" : "GEA AI Assistant"}:</b>
              <div className="prose max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Input & Buttons - Responsive */}
      <div className="w-full max-w-4xl p-4 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            className="border rounded p-3 w-full sm:w-4/5 focus:ring focus:ring-blue-300"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <button
            className="bg-blue-500 text-white p-3 rounded w-full sm:w-1/5 hover:bg-blue-600 transition"
            onClick={sendMessage}
            disabled={loading}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>

        <button
          className="bg-red-500 text-white p-3 rounded w-full hover:bg-red-600 transition"
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
    </div>
  );
}
