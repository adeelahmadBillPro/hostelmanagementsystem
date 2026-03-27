"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { formatDate } from "@/lib/utils";
import {
  MessageCircle,
  Send,
  Plus,
  ArrowLeft,
  X,
  User,
  Paperclip,
  FileText,
  Loader2,
} from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

interface ConversationData {
  id: string;
  subject: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage: {
    content: string;
    senderName: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface ConversationDetail {
  id: string;
  subject: string;
  isActive: boolean;
  messages: MessageData[];
}

export default function PortalMessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newFirstMessage, setNewFirstMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setChatLoading(true);
    try {
      const res = await fetch(`/api/portal/messages/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedConversation(data.conversation);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setChatLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [selectedConversation]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    fetchMessages(id);
    setMobileShowChat(true);
    // Update unread count locally
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/portal/messages/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages(selectedId);
        fetchConversations();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!newSubject.trim() || !newFirstMessage.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject.trim(),
          message: newFirstMessage.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowNewModal(false);
        setNewSubject("");
        setNewFirstMessage("");
        await fetchConversations();
        handleSelectConversation(data.conversation.id);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setCreating(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  function renderMessageContent(content: string) {
    const fileMatch = content.match(/\[FILE:(image|document|video):(.+?):(.+?)\]/);
    if (fileMatch) {
      const [, type, url, name] = fileMatch;
      if (type === "image") {
        return <img src={url} alt={name} className="max-w-[240px] rounded-lg cursor-pointer" onClick={() => window.open(url)} />;
      }
      if (type === "video") {
        return <video src={url} controls className="max-w-[280px] rounded-lg" />;
      }
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 underline">
          <FileText size={16} />{name}
        </a>
      );
    }
    return <span>{content}</span>;
  }

  const handleFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;

    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        setUploadingFile(false);
        return;
      }

      const uploadData = await uploadRes.json();
      const fileType = uploadData.fileType || "document";
      const fileMessage = `[FILE:${fileType}:${uploadData.url}:${uploadData.fileName}]`;

      const res = await fetch(`/api/portal/messages/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fileMessage }),
      });

      if (res.ok) {
        fetchMessages(selectedId);
        fetchConversations();
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <DashboardLayout title="Messages" hostelId="">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle size={28} className="text-blue-500" />
            <h1 className="page-title">Messages</h1>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Conversation</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading conversations...
          </div>
        ) : (
          <div className="card p-0 overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
            <div className="flex h-full">
              {/* Conversation List */}
              <div
                className={`w-full md:w-[360px] border-r border-gray-200 dark:border-[#1E2D42] flex flex-col ${
                  mobileShowChat ? "hidden md:flex" : "flex"
                }`}
              >
                <div className="p-4 border-b border-gray-200 dark:border-[#1E2D42]">
                  <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Conversations ({conversations.length})
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <MessageCircle size={40} className="mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No conversations yet</p>
                      <p className="text-xs mt-1">Start one by clicking the button above</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full text-left p-4 border-b border-gray-100 dark:border-[#1E2D42] hover:bg-gray-50 dark:hover:bg-[#0B1222] transition-colors ${
                          selectedId === conv.id
                            ? "bg-blue-50 dark:bg-[#0B1222] border-l-2 border-l-blue-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <User size={18} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {conv.subject}
                              </h3>
                              {conv.unreadCount > 0 && (
                                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                {conv.lastMessage.content}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                              {conv.lastMessage
                                ? formatTime(conv.lastMessage.createdAt)
                                : formatTime(conv.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Panel */}
              <div
                className={`flex-1 flex flex-col ${
                  !mobileShowChat ? "hidden md:flex" : "flex"
                }`}
              >
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-[#1E2D42] flex items-center gap-3">
                      <button
                        onClick={() => {
                          setMobileShowChat(false);
                          setSelectedId(null);
                          setSelectedConversation(null);
                        }}
                        className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                        <MessageCircle size={16} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                          {selectedConversation.subject}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Chat with Management
                        </p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-[#0B1222]">
                      {chatLoading ? (
                        <div className="text-center py-8 text-gray-400">
                          Loading messages...
                        </div>
                      ) : (
                        selectedConversation.messages.map((msg) => {
                          const isMine = msg.sender.id === session?.user?.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                  isMine
                                    ? "bg-blue-500 text-white rounded-br-md"
                                    : "bg-white dark:bg-[#111C2E] text-gray-900 dark:text-gray-100 rounded-bl-md shadow-sm"
                                }`}
                              >
                                {!isMine && (
                                  <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 mb-0.5">
                                    {msg.sender.name}
                                  </p>
                                )}
                                <div className="text-sm whitespace-pre-wrap break-words">
                                  {renderMessageContent(msg.content)}
                                </div>
                                <p
                                  className={`text-[10px] mt-1 ${
                                    isMine
                                      ? "text-blue-100"
                                      : "text-gray-400 dark:text-gray-500 dark:text-slate-400"
                                  }`}
                                >
                                  {formatTimestamp(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    {selectedConversation.isActive && (
                      <div className="p-4 border-t border-gray-200 dark:border-[#1E2D42] bg-white dark:bg-[#111C2E]">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf,video/*,.doc,.docx"
                          onChange={handleFileAttachment}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFile}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-[#0B1222] transition-colors disabled:opacity-50"
                            title="Attach file"
                          >
                            {uploadingFile ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Paperclip size={18} />
                            )}
                          </button>
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Type a message..."
                            className="input flex-1"
                          />
                          <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sending}
                            className="btn-primary p-2.5 rounded-xl disabled:opacity-50"
                          >
                            <Send size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 dark:text-slate-400">
                    <div className="text-center">
                      <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Select a conversation to start chatting</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                New Conversation
              </h2>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setNewSubject("");
                  setNewFirstMessage("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g., Room maintenance request"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message
                </label>
                <textarea
                  value={newFirstMessage}
                  onChange={(e) => setNewFirstMessage(e.target.value)}
                  placeholder="Write your message..."
                  rows={4}
                  className="input w-full resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowNewModal(false);
                    setNewSubject("");
                    setNewFirstMessage("");
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateConversation}
                  disabled={!newSubject.trim() || !newFirstMessage.trim() || creating}
                  className="btn-primary disabled:opacity-50"
                >
                  {creating ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
