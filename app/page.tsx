"use client";

// Import necessary libraries and modules
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import remarkGfm from "remark-gfm";
import { User, Bot, Copy, Check, ExternalLink, Send, Trash2, ClipboardCopy } from "lucide-react";
import { usePageContext } from "@/hooks/usePageContext";

// Define Message type
interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

// Main ChatApp component
const ChatApp = () => {
  // Define States
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeRun, setActiveRun] = useState(false);
  const [typing, setTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Page Context Hook
  const {
    pageContext,
    hasContext,
    buildContextDescription,
    getContextSummary,
    getErrorMessage,
    isEmbedded,
    threadId,
    setThreadId,
    clearThreadId,
  } = usePageContext();

  // Show error message if origin validation failed
  const errorMessage = getErrorMessage();
  useEffect(() => {
    if (errorMessage && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    }
  }, [errorMessage]);

  // Welcome message based on context (only if no error)
  useEffect(() => {
    if (messages.length === 0 && !errorMessage) {
      let welcomeMessage = "Hello! I'm the EA Portal Bot. How can I help you today?";

      if (hasContext && pageContext?.route) {
        const routeMessages: Record<string, string> = {
          '/': "Welcome to the GEA Portal! I can help you navigate to feedback, grievances, or EA services.",
          '/feedback': "I can help you submit feedback for government services. Just ask if you need guidance on any step!",
          '/grievance': "I can help you file a grievance. Let me know if you have any questions about the process.",
          '/admin/analytics': "I can help you understand the analytics dashboard. Ask me about any chart or metric!",
          '/admin/grievances': "I can help you manage grievances. Ask me about status updates, priorities, or SLAs.",
        };

        welcomeMessage = routeMessages[pageContext.route] ||
          `I see you're on ${pageContext.route}. How can I help you with this page?`;
      }

      setMessages([{
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toLocaleTimeString(),
      }]);
      setShowWelcome(false); // Hide welcome screen after adding message
    }
  }, [hasContext, pageContext?.route, errorMessage, messages.length]);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("chatHistory");

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
        // Hide welcome if there are existing messages
        if (parsedMessages.length > 0) {
          setShowWelcome(false);
        }
      } catch (error) {
        console.error("Error parsing saved messages:", error);
      }
    }
    // Note: threadId is now managed by usePageContext hook
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Save chat history in localStorage
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
    // Note: threadId is now managed by usePageContext hook
  }, [messages]);

  // Function to send user message and receive assistant response
  const sendMessage = async () => {
    if (activeRun || !input.trim()) return;

    // Hide welcome screen on first message
    if (showWelcome) {
      setShowWelcome(false);
    }

    setActiveRun(true);
    setLoading(true);

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toLocaleString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");

    try {
      setTyping(true);

      // Build context description
      const contextDescription = buildContextDescription();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          threadId: threadId,
          contextDescription: hasContext ? contextDescription : undefined,
          sourceUrl: pageContext?.route || null,
        }),
      });

    // Check if response is ok first
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the response as text first to check if it's empty
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', responseText);
      throw new Error('Invalid JSON response from server');
    }

    // Check if the parsed data has an error
    if (data.error) {
      throw new Error(data.error);
    }

    // Update thread ID if we got a new one
    if (data.threadId && data.threadId !== threadId) {
      setThreadId(data.threadId);
    }

    // Add assistant response to messages
    setMessages((prev) => [
      ...prev,
      { 
        role: "assistant", 
        content: data.reply || "No response received", 
        timestamp: new Date().toLocaleString() 
      },
    ]);

  } catch (error: any) {
    console.error("Error:", error);
    
    let errorMessage = "Unable to reach assistant.";
    
    if (error.message) {
      errorMessage = error.message;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Error: ${errorMessage}`,
        timestamp: new Date().toLocaleString(),
      },
    ]);
  } finally {
      setTyping(false);
      setLoading(false);
      setActiveRun(false);
    }
  };

  // Copy individual message to clipboard
  const copyMessageToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000); // Show checkmark for 2s
    } catch (err) {
      console.error("Failed to copy message: ", err);
    }
  };

  // Copy chat to clipboard
  const copyChatToClipboard = async () => {
    const chatText = messages
      .map((msg) => `${msg.timestamp} - ${msg.role === "user" ? "You" : "EA Portal Bot"}:\n${msg.content}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(chatText);
      alert("Chat copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy chat: ", err);
      alert("Failed to copy chat to clipboard.");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between w-full px-4 py-3 bg-white shadow-md">
        <div className="flex items-center space-x-3">
          <img
            src="/icon.png"
            alt="GEA"
            className="h-10 w-10 sm:h-12 sm:w-12 rounded"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              EA Portal Bot
            </h2>
            {hasContext && (
              <p className="text-xs text-gray-500">
                {getContextSummary()}
              </p>
            )}
          </div>
        </div>

        {/* Context indicator */}
        {hasContext && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <span className="w-2 h-2 mr-1 bg-green-500 rounded-full animate-pulse"></span>
            Connected
          </span>
        )}
      </header>

      {/* Chat Container */}
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col p-4 overflow-hidden">
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto border p-3 bg-white shadow rounded-lg"
        >
          <div className="space-y-4">
          {/* Welcome Screen */}
          {showWelcome && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center h-full p-6"
            >
              {/* Welcome Icon */}
              <div className="mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <Bot className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Welcome Message */}
              <div className="text-center max-w-2xl mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                  Welcome to EA Portal Bot
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  I'm here to help you navigate through the GEA Portal. Ask me about features, processes, or how to complete tasks on any page.
                </p>
              </div>

              {/* Context-based Quick Actions */}
              {hasContext && pageContext?.route ? (
                <div className="w-full max-w-2xl mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                    Quick actions for this page
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setInput("What can I do on this page?");
                        setShowWelcome(false);
                      }}
                      className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border border-blue-200 text-gray-800 transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="font-medium">→ What can I do on this page?</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput("How do I complete the main task on this page?");
                        setShowWelcome(false);
                      }}
                      className="w-full text-left px-4 py-3 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-lg border border-emerald-200 text-gray-800 transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="font-medium">→ How do I complete the main task here?</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput("Show me step-by-step instructions for this page");
                        setShowWelcome(false);
                      }}
                      className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg border border-purple-200 text-gray-800 transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="font-medium">→ Show me step-by-step instructions</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-2xl mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                    How can I help you?
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setInput("How do I submit feedback?");
                        setShowWelcome(false);
                      }}
                      className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border border-blue-200 text-gray-800 transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="font-medium">→ How do I submit feedback?</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput("How do I file a grievance?");
                        setShowWelcome(false);
                      }}
                      className="w-full text-left px-4 py-3 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-lg border border-emerald-200 text-gray-800 transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="font-medium">→ How do I file a grievance?</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput("What services are available on the portal?");
                        setShowWelcome(false);
                      }}
                      className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg border border-purple-200 text-gray-800 transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="font-medium">→ What services are available?</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Or Start Typing */}
              <p className="text-gray-500 text-sm">
                Or type your own question below to get started
              </p>
            </motion.div>
          )}

          {/* Messages */}
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="group"
            >
              {/* Message Header with Avatar */}
              <div className="flex items-center gap-2 mb-2">
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-blue-500"
                      : "bg-gradient-to-br from-green-500 to-emerald-600"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Name and Timestamp */}
                <div className="flex-grow flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {msg.role === "user" ? "You" : "EA Portal Bot"}
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.timestamp && (
                      <span className="text-xs text-gray-500">{msg.timestamp}</span>
                    )}
                    {/* Copy Button - Shows on hover */}
                    <button
                      onClick={() => copyMessageToClipboard(msg.content, index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-100 rounded"
                      aria-label="Copy message"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div
                className={`p-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-50 border border-blue-100 ml-10"
                    : "bg-white border border-gray-200 shadow-sm ml-10"
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Headers with proper hierarchy
                    h1: ({ ...props }) => (
                      <h1 className="text-2xl font-bold mb-3 mt-4 first:mt-0 text-gray-900" {...props} />
                    ),
                    h2: ({ ...props }) => (
                      <h2 className="text-xl font-bold mb-3 mt-3 first:mt-0 text-gray-900" {...props} />
                    ),
                    h3: ({ ...props }) => (
                      <h3 className="text-lg font-semibold mb-2 mt-3 first:mt-0 text-gray-900" {...props} />
                    ),
                    h4: ({ ...props }) => (
                      <h4 className="text-base font-semibold mb-2 mt-2 first:mt-0 text-gray-900" {...props} />
                    ),

                    // Code blocks - inline and block
                    code: ({ node, inline, className, children, ...props }: any) => {
                      // Check if it's inline code (inline prop is more reliable than className)
                      if (inline) {
                        return (
                          <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        );
                      }
                      // Block code
                      return (
                        <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm font-mono my-2" {...props}>
                          {children}
                        </code>
                      );
                    },

                    // Paragraphs with proper spacing
                    p: ({ ...props }) => (
                      <p className="mb-3 leading-relaxed text-gray-800 last:mb-0" {...props} />
                    ),

                    // Lists
                    ul: ({ ...props }) => (
                      <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />
                    ),
                    ol: ({ ...props }) => (
                      <ol className="list-decimal pl-6 mb-3 space-y-1" {...props} />
                    ),
                    li: ({ ...props }) => (
                      <li className="text-gray-800 leading-relaxed" {...props} />
                    ),

                    // Links with external indicator
                    a: ({ href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 group/link"
                        {...props}
                      >
                        {children}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    ),

                    // Blockquotes
                    blockquote: ({ ...props }) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-3 italic text-gray-700 bg-gray-50 rounded-r" {...props} />
                    ),

                    // Tables with responsive wrapper
                    table: ({ ...props }) => (
                      <div className="overflow-x-auto my-3">
                        <table className="min-w-full border-collapse border border-gray-300" {...props} />
                      </div>
                    ),
                    thead: ({ ...props }) => (
                      <thead {...props} />
                    ),
                    tbody: ({ ...props }) => (
                      <tbody {...props} />
                    ),
                    th: ({ ...props }) => (
                      <th className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold" {...props} />
                    ),
                    td: ({ ...props }) => (
                      <td className="border border-gray-300 px-4 py-2" {...props} />
                    ),

                    // Horizontal rules
                    hr: ({ ...props }) => (
                      <hr className="my-4 border-gray-300" {...props} />
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}
          {/* Typing Indicator */}
          {typing && (
            <div className="text-gray-500 italic text-center p-2">Assistant is typing...</div>
          )}
          </div>
        </div>
      </div>

      {/* Input & Controls */}
      <div className="w-full max-w-4xl mx-auto p-4 flex flex-col gap-3">
        {/* Textarea Input */}
        <textarea
          className="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 outline-none transition-all resize-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !loading) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type your question here... (Shift+Enter for new line)"
          disabled={loading}
          rows={3}
        />

        {/* Action Buttons Row - 25% Copy, 25% Clear, 50% Send */}
        <div className="flex gap-2">
          {/* Copy Button - 25% */}
          <button
            className="group relative flex-1 p-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            onClick={copyChatToClipboard}
            disabled={messages.length === 0}
            aria-label="Copy chat"
          >
            <ClipboardCopy className="w-5 h-5" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Copy Chat
            </span>
          </button>

          {/* Clear Button - 25% */}
          <button
            className="group relative flex-1 p-3 bg-white hover:bg-red-50 border-2 border-gray-300 hover:border-red-400 text-gray-700 hover:text-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            onClick={() => {
              setMessages([]);
              clearThreadId();
              setShowWelcome(true);
              localStorage.removeItem("chatHistory");
            }}
            disabled={messages.length === 0}
            aria-label="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Clear Chat
            </span>
          </button>

          {/* Send Button - 50% */}
          <button
            className="group relative flex-[2] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            onClick={sendMessage}
            disabled={loading}
            aria-label="Send message"
          >
            {loading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {loading ? "Sending..." : "Send Message"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;