"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { Message } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: Message[];
}

interface ChatContextType {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: string;
  error: Error | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  const { fileSystem, handleToolCall } = useFileSystem();
  const processedToolIds = useRef(new Set<string>());

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
  } = useAIChat({
    api: "/api/chat",
    initialMessages,
    body: {
      files: fileSystem.serialize(),
      projectId,
    },
    onToolCall: ({ toolCall }) => {
      handleToolCall(toolCall);
    },
  });

  // Server-side tools (with execute) don't trigger onToolCall on the client.
  // Watch messages for completed tool invocations and sync them to the client VFS
  // so the preview stays up to date.
  useEffect(() => {
    for (const message of messages) {
      if (message.role === "assistant" && message.parts) {
        for (const part of message.parts as any[]) {
          if (
            part.type === "tool-invocation" &&
            part.toolInvocation?.state === "result"
          ) {
            const { toolCallId, toolName, args } = part.toolInvocation;
            if (!processedToolIds.current.has(toolCallId)) {
              processedToolIds.current.add(toolCallId);
              handleToolCall({ toolName, args });
            }
          }
        }
      }
    }
  }, [messages, handleToolCall]);

  // Track anonymous work
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        handleInputChange,
        handleSubmit,
        status,
        error: error ?? null,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}