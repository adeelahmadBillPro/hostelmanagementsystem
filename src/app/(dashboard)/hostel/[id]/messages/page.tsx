"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { formatDate } from "@/lib/utils";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  User,
  Search,
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
  resident: {
    id: string;
    name: string;
    email: string;
    roomNumber: string;
    bedNumber: string;
  };
  lastMessage: {
    content: string;
    senderName: string;
    senderId: string;
    senderRole: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface ConversationDetail {
  id: string;
  subject: string;
  isActive: boolean;
  resident: {
    id: string;
    user: { id: string; name: string; email: string };
    room: { roomNumber: string };
    bed: { bedNumber: string };
  };
  messages: MessageData[];
}

export default function HostelMessagesPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      setChatLoading(true);
      try {
        const res = await fetch(
          `/api/hostels/${hostelId}/messages/${conversationId}`
        );
        if (res.ok) {
          const data = await res.json();
          setSelectedConversation(data.conversation);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setChatLoading(false);
      }
    },
    [hostelId]
  );

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
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/hostels/${hostelId}/messages/${selectedId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newMessage.trim() }),
        }
      );
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filteredConversations = searchQuery
    ? conversations.filter(
        (c) =>
          c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.resident.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.resident.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <DashboardLayout title="Messages" hostelId={hostelId}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle size={28} className="text-blue-500" />
            <h1 className="page-title">Messages</h1>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {totalUnread} unread
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading conversations...
          </div>
        ) : (
          <div
            className="card p-0 overflow-hidden"
            style={{ height: "calc(100vh - 220px)" }}
          >
            <div className="flex h-full">
              {/* Conversation List */}
              <div
                className={`w-full md:w-[380px] border-r border-gray-200 dark:border-[#1E2D42] flex flex-col ${
                  mobileShowChat ? "hidden md:flex" : "flex"
                }`}
              >
                <div className="p-4 border-b border-gray-200 dark:border-[#1E2D42] space-y-3">
                  <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                    All Conversations ({conversations.length})
                  </h2>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, subject, room..."
                      className="input w-full pl-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <MessageCircle
                        size={40}
                        className="mx-auto mb-3 opacity-50"
                      />
                      <p className="text-sm">No conversations found</p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {getInitials(conv.resident.name)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {conv.resident.name}
                              </h3>
                              {conv.unreadCount > 0 && (
                                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">
                              Room {conv.resident.roomNumber} - Bed{" "}
                              {conv.resident.bedNumber}
                            </p>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate mt-1">
                              {conv.subject}
                            </p>
                            {conv.lastMessage && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {conv.lastMessage.senderRole !== "RESIDENT"
                                  ? "You: "
                                  : ""}
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
                        <span className="text-white text-xs font-bold">
                          {getInitials(
                            selectedConversation.resident.user.name
                          )}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                          {selectedConversation.subject}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedConversation.resident.user.name} - Room{" "}
                          {selectedConversation.resident.room.roomNumber}
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
                          const isMine =
                            msg.sender.id === session?.user?.id;
                          const isResident =
                            msg.sender.role === "RESIDENT";
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${
                                isMine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                  isMine
                                    ? "bg-blue-500 text-white rounded-br-md"
                                    : "bg-white dark:bg-[#111C2E] text-gray-900 dark:text-gray-100 rounded-bl-md shadow-sm"
                                }`}
                              >
                                {!isMine && (
                                  <p className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 mb-0.5">
                                    {msg.sender.name}{" "}
                                    {isResident ? "(Resident)" : ""}
                                  </p>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {msg.content}
                                </p>
                                <p
                                  className={`text-[10px] mt-1 ${
                                    isMine
                                      ? "text-blue-100"
                                      : "text-gray-400 dark:text-gray-500"
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
                        <div className="flex items-center gap-2">
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
                            placeholder="Type a reply..."
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
                  <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <div className="text-center">
                      <MessageCircle
                        size={48}
                        className="mx-auto mb-3 opacity-30"
                      />
                      <p className="text-sm">
                        Select a conversation to view messages
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
