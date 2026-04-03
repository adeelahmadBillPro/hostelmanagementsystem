"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/providers";
import { MessageSquare, Users, CheckCheck, Loader2, ChevronDown, ChevronUp, Send, Reply, Inbox } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ReceivedItem {
  id: string;
  isRead: boolean;
  readAt: string | null;
  message: {
    id: string;
    subject: string;
    body: string;
    targetAll: boolean;
    createdAt: string;
    sender: { id: string; name: string };
  };
}

interface SentMessage {
  id: string;
  subject: string;
  body: string;
  targetAll: boolean;
  createdAt: string;
  sender: { name: string };
  recipients: { id: string; isRead: boolean; user: { id: string; name: string } }[];
}

export default function ManagerMessagesPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const role = (session?.user as any)?.role;

  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<ReceivedItem[]>([]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  // Reply / compose
  const [replyTo, setReplyTo] = useState<ReceivedItem | null>(null);
  const [replyForm, setReplyForm] = useState({ subject: "", body: "" });
  const [replying, setReplying] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/managers/messages");
      if (res.ok) {
        const data = await res.json();
        setReceived(data.received || []);
        setUnread(data.unread || data.unreadFromManagers || 0);
        if (role === "TENANT_ADMIN") {
          setSent(data.sent || []);
        } else {
          setSent(data.replies || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (role) fetchMessages();
  }, [role, fetchMessages]);

  const markAsRead = async (messageId: string) => {
    await fetch("/api/managers/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    setReceived((prev) =>
      prev.map((r) =>
        r.message.id === messageId ? { ...r, isRead: true, readAt: new Date().toISOString() } : r
      )
    );
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    await fetch("/api/managers/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setReceived((prev) => prev.map((r) => ({ ...r, isRead: true, readAt: new Date().toISOString() })));
    setUnread(0);
    setMarkingAll(false);
  };

  const toggleExpand = (id: string, isRead: boolean, messageId: string) => {
    setExpanded((prev) => (prev === id ? null : id));
    if (!isRead) markAsRead(messageId);
  };

  const openReply = (item: ReceivedItem) => {
    setReplyTo(item);
    setReplyForm({
      subject: `Re: ${item.message.subject}`,
      body: "",
    });
  };

  const sendReply = async () => {
    if (!replyForm.subject.trim() || !replyForm.body.trim()) {
      addToast("Subject and message body are required", "error");
      return;
    }
    setReplying(true);
    try {
      const res = await fetch("/api/managers/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: replyForm.subject, body: replyForm.body }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Failed to send reply", "error");
      } else {
        addToast("Reply sent successfully", "success");
        setReplyTo(null);
        setReplyForm({ subject: "", body: "" });
        fetchMessages();
        setActiveTab("sent");
      }
    } catch {
      addToast("Failed to send reply", "error");
    } finally {
      setReplying(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Messages">
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const isAdmin = role === "TENANT_ADMIN";
  const receivedLabel = isAdmin ? "From Managers" : "From Admin";
  const sentLabel = isAdmin ? "Sent to Managers" : "My Replies";

  return (
    <DashboardLayout title="Messages">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Messages</h1>
            <p className="text-sm text-text-muted mt-1">
              {isAdmin ? "Communication with your managers" : "Messages from hostel administration"}
            </p>
          </div>
          {unread > 0 && activeTab === "received" && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
              Mark All Read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border dark:border-[#1E2D42] pb-0">
          {(["received", "sent"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab === "received" ? (
                <span className="flex items-center gap-2">
                  <Inbox size={14} />
                  {receivedLabel}
                  {unread > 0 && (
                    <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unread}
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send size={14} />
                  {sentLabel}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Received Tab */}
        {activeTab === "received" && (
          received.length === 0 ? (
            <div className="card text-center py-16">
              <MessageSquare size={48} className="mx-auto text-text-muted opacity-30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Messages</h3>
              <p className="text-text-muted text-sm">
                {isAdmin ? "No messages from managers yet." : "You have no messages from administration yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {received.map((r) => (
                <div
                  key={r.id}
                  className={`card !p-0 overflow-hidden transition-shadow hover:shadow-md ${
                    !r.isRead ? "border-l-4 border-primary" : ""
                  }`}
                >
                  <button
                    className="w-full flex items-start gap-3 px-4 py-3 text-left"
                    onClick={() => toggleExpand(r.id, r.isRead, r.message.id)}
                  >
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${!r.isRead ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${!r.isRead ? "font-semibold text-text-primary dark:text-white" : "text-text-secondary dark:text-slate-300"}`}>
                          {r.message.subject}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {r.message.targetAll && (
                            <span className="flex items-center gap-1 text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                              <Users size={10} /> Broadcast
                            </span>
                          )}
                          <span className="text-xs text-text-muted">{formatDate(r.message.createdAt)}</span>
                          {expanded === r.id ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                        </div>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">From: {r.message.sender.name}</p>
                    </div>
                  </button>
                  {expanded === r.id && (
                    <div className="px-4 pb-4 pt-1 border-t border-border dark:border-[#1E2D42] ml-5">
                      <p className="text-sm text-text-secondary dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-3">
                        {r.message.body}
                      </p>
                      <button
                        onClick={() => openReply(r)}
                        className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
                      >
                        <Reply size={13} /> Reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Sent Tab */}
        {activeTab === "sent" && (
          sent.length === 0 ? (
            <div className="card text-center py-16">
              <Send size={48} className="mx-auto text-text-muted opacity-30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sent Messages</h3>
              <p className="text-text-muted text-sm">
                {isAdmin ? "Go to Managers page and use the message icon to send." : "You haven't replied to any messages yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sent.map((m) => {
                const readCount = m.recipients.filter((r) => r.isRead).length;
                const total = m.recipients.length;
                return (
                  <div key={m.id} className="card !p-0 overflow-hidden hover:shadow-md transition-shadow">
                    <button
                      className="w-full flex items-start gap-3 px-4 py-3 text-left"
                      onClick={() => setExpanded((prev) => (prev === m.id ? null : m.id))}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary dark:text-white truncate">{m.subject}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {m.targetAll && (
                              <span className="flex items-center gap-1 text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                                <Users size={10} /> All Managers
                              </span>
                            )}
                            <span className="text-xs text-text-muted">{formatDate(m.createdAt)}</span>
                            {expanded === m.id ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                          </div>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          To: {m.targetAll ? "All Managers" : m.recipients[0]?.user.name || "Admin"} · Read {readCount}/{total}
                        </p>
                      </div>
                    </button>
                    {expanded === m.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-border dark:border-[#1E2D42]">
                        <p className="text-sm text-text-secondary dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-3">
                          {m.body}
                        </p>
                        {m.recipients.length > 0 && isAdmin && (
                          <div className="flex flex-wrap gap-2">
                            {m.recipients.map((r) => (
                              <span
                                key={r.id}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                                  r.isRead
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-text-muted"
                                }`}
                              >
                                {r.isRead && <CheckCheck size={10} />}
                                {r.user.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Reply Modal */}
      <Modal
        isOpen={!!replyTo}
        onClose={() => setReplyTo(null)}
        title={`Reply to ${replyTo?.message.sender.name || ""}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {replyTo && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1222] text-xs text-text-muted border-l-4 border-border dark:border-[#1E2D42]">
              <p className="font-medium text-text-secondary dark:text-slate-300 mb-1">{replyTo.message.subject}</p>
              <p className="line-clamp-2">{replyTo.message.body}</p>
            </div>
          )}
          <div>
            <label className="label">Subject</label>
            <input
              type="text"
              value={replyForm.subject}
              onChange={(e) => setReplyForm((p) => ({ ...p, subject: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Your Reply *</label>
            <textarea
              value={replyForm.body}
              onChange={(e) => setReplyForm((p) => ({ ...p, body: e.target.value }))}
              className="textarea"
              rows={5}
              placeholder="Write your reply here..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setReplyTo(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={sendReply}
              disabled={replying}
              className="btn-primary flex items-center gap-2"
            >
              {replying ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
              ) : (
                <><Send size={15} /> Send Reply</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
