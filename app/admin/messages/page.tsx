"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";
import {
  Mail,
  MailOpen,
  Clock,
  MessageSquare,
} from "lucide-react";

type Submission = {
  _id: Id<"contactSubmissions">;
  _creationTime: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  consent: boolean;
  read: boolean;
};

export default function MessagesAdminPage() {
  const submissions = useQuery(api.admin.getContactSubmissions, {});
  const markRead = useMutation(api.admin.markSubmissionRead);

  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const handleSelect = async (submission: Submission) => {
    setSelectedSubmission(submission);
    if (!submission.read) {
      await markRead({ id: submission._id, read: true });
    }
  };

  const handleToggleRead = async (submission: Submission) => {
    await markRead({ id: submission._id, read: !submission.read });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (submissions === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7B6E9E]"></div>
      </div>
    );
  }

  const filteredSubmissions =
    filter === "unread" ? submissions.filter((s) => !s.read) : submissions;

  const unreadCount = submissions.filter((s) => !s.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-[1.5px] bg-[#D4B483]" />
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#D4B483]">
              Inbox
            </span>
          </div>
          <h1 className="text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">
            Messages
          </h1>
          <p className="text-[#3B5249]/65 mt-2">
            Contact form submissions from your website visitors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45 ${filter === "all"
              ? "bg-[#3B5249] text-[#FAF6F0]"
              : "bg-white border border-[#D4B483]/25 text-[#3B5249]/75 hover:bg-[#FAF6F0]"
              }`}
          >
            All ({submissions.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45 ${filter === "unread"
              ? "bg-[#3B5249] text-[#FAF6F0]"
              : "bg-white border border-[#D4B483]/25 text-[#3B5249]/75 hover:bg-[#FAF6F0]"
              }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Messages Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Messages List */}
        <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm overflow-hidden">
          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="mx-auto text-[#3B5249]/30 mb-4" size={48} />
              <p className="text-[#3B5249]/60">
                {filter === "unread" ? "No unread messages" : "No messages yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#D4B483]/15 max-h-[600px] overflow-y-auto">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission._id}
                  onClick={() => handleSelect(submission)}
                  className={`p-4 cursor-pointer transition-colors ${selectedSubmission?._id === submission._id
                    ? "bg-[#7B6E9E]/8 border-l-4 border-[#7B6E9E]"
                    : "hover:bg-[#FAF6F0]/60"
                    } ${!submission.read ? "bg-[#D4B483]/10" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-full ${submission.read ? "bg-[#FAF6F0]" : "bg-[#7B6E9E]/10"}`}
                    >
                      {submission.read ? (
                        <MailOpen className="text-[#3B5249]/40" size={18} />
                      ) : (
                        <Mail className="text-[#7B6E9E]" size={18} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-medium ${!submission.read ? "text-[#3B5249]" : "text-[#3B5249]/80"}`}
                        >
                          {submission.name}
                        </span>
                        <span className="text-xs text-[#3B5249]/50">
                          {formatDate(submission._creationTime)}
                        </span>
                      </div>
                      <p className="text-sm text-[#3B5249]/55 truncate">
                        {submission.email}
                      </p>
                      <p className="text-sm text-[#3B5249]/65 mt-1 line-clamp-2">
                        {submission.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm">
          {selectedSubmission ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-[#D4B483]/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">
                      {selectedSubmission.name}
                    </h2>
                    <a
                      href={`mailto:${selectedSubmission.email}`}
                      className="text-[#7B6E9E] hover:underline"
                    >
                      {selectedSubmission.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRead(selectedSubmission)}
                      className="p-2 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45"
                      title={
                        selectedSubmission.read
                          ? "Mark as unread"
                          : "Mark as read"
                      }
                    >
                      {selectedSubmission.read ? (
                        <Mail size={18} />
                      ) : (
                        <MailOpen size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="text-[#3B5249]/45" size={16} />
                  <span className="text-[#3B5249]/55">Received:</span>
                  <span className="font-medium text-[#3B5249]">
                    {formatDate(selectedSubmission._creationTime)}
                  </span>
                </div>
                {selectedSubmission.subject && (
                  <div className="text-sm">
                    <span className="text-[#3B5249]/55">Subject: </span>
                    <span className="font-medium text-[#3B5249]">{selectedSubmission.subject}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-[#D4B483]/20">
                  <h3 className="font-medium text-[#3B5249] mb-2">Message</h3>
                  <p className="text-[#3B5249]/80 whitespace-pre-wrap leading-relaxed">
                    {selectedSubmission.message}
                  </p>
                </div>
              </div>

              {/* Reply Button */}
              <div className="p-6 border-t border-[#D4B483]/20">
                <a
                  href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject ?? "Your inquiry"}`}
                  className="w-full flex items-center justify-center gap-2 bg-[#3B5249] text-[#FAF6F0] px-6 py-3 rounded-full hover:bg-[#7B6E9E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6E9E]/45"
                >
                  <Mail size={18} />
                  Reply via Email
                </a>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12">
              <div className="text-center">
                <Mail className="mx-auto text-[#3B5249]/30 mb-4" size={48} />
                <p className="text-[#3B5249]/60">
                  Select a message to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
