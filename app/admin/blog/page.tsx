"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";
import { useAdminConfirm } from "@/components/admin/AdminConfirmProvider";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  GripVertical,
} from "lucide-react";

type BlogPost = {
  _id: Id<"blogPosts">;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  readTime: string;
  content: string;
  published: boolean;
  order: number;
};

export default function BlogPostsAdminPage() {
  const { language } = useAdminLanguage();

  const posts = useQuery(api.admin.getBlogPostsAdmin, {
    lang: language ?? undefined,
  });
  const updatePost = useMutation(api.admin.updateBlogPost);
  const deletePost = useMutation(api.admin.deleteBlogPost);
  const { confirmAction } = useAdminConfirm();

  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [orderedPosts, setOrderedPosts] = useState<BlogPost[] | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  useEffect(() => {
    if (posts !== undefined) {
      setOrderedPosts(posts as BlogPost[]);
    }
  }, [posts]);

  const handleTogglePublished = async (post: BlogPost) => {
    await updatePost({
      id: post._id,
      published: !post.published,
    });
  };

  const handleDeleteClick = async (id: Id<"blogPosts">) => {
    await confirmAction({
      title: "Delete blog post?",
      description: "This action cannot be undone.",
      variant: "destructive",
      confirmText: "Delete",
      confirmTextPending: "Deleting…",
      action: async () => {
        await deletePost({ id });
      },
    });
  };

  if (posts === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7B6E9E]"></div>
      </div>
    );
  }

  const list = orderedPosts ?? (posts as BlogPost[]);
  const filteredPosts = list.filter((post) => {
    if (filter === "published") return post.published;
    if (filter === "draft") return !post.published;
    return true;
  });

  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = posts.filter((p) => !p.published).length;

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const next = [...list];
    const draggedItem = next[draggedIndex];
    next.splice(draggedIndex, 1);
    next.splice(index, 0, draggedItem);
    setOrderedPosts(next);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);

    const current = orderedPosts;
    if (!current || isSavingOrder) return;

    const originalIds = (posts as BlogPost[]).map((post) => post._id);
    const nextIds = current.map((post) => post._id);
    const changed =
      originalIds.length !== nextIds.length ||
      originalIds.some((id, i) => id !== nextIds[i]);
    if (!changed) return;

    try {
      setIsSavingOrder(true);
      const updates = current.map((post, index) =>
        post.order === index
          ? null
          : updatePost({
            id: post._id,
            order: index,
          }),
      );
      await Promise.all(updates.filter(Boolean) as Promise<unknown>[]);
    } finally {
      setIsSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-[1.5px] bg-[#D4B483]" />
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#D4B483]">
              Publishing
            </span>
          </div>
          <h1 className="text-4xl [font-family:Georgia,serif] font-medium text-[#3B5249] tracking-tight">
            Blog Posts
          </h1>
          <p className="text-[#3B5249]/65 mt-2">
            Manage your blog articles. Published posts appear on your website.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pages/blog?section=categories"
            className="px-4 py-2 rounded-full bg-[#7B6E9E]/10 text-[#3B5249] border border-[#7B6E9E]/20 hover:bg-[#7B6E9E]/15 transition-colors"
          >
            Manage Categories
          </Link>
          <Link
            href="/admin/blog/new"
            className="flex items-center gap-2 bg-[#3B5249] text-[#FAF6F0] px-4 py-2 rounded-full hover:bg-[#7B6E9E] transition-colors"
          >
            <Plus size={20} />
            New Post
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg transition-colors ${filter === "all"
            ? "bg-[#3B5249] text-[#FAF6F0]"
            : "bg-white border border-[#D4B483]/25 text-[#3B5249]/75 hover:bg-[#FAF6F0]"
            }`}
        >
          All ({posts.length})
        </button>
        <button
          onClick={() => setFilter("published")}
          className={`px-4 py-2 rounded-lg transition-colors ${filter === "published"
            ? "bg-[#3B5249] text-[#FAF6F0]"
            : "bg-white border border-[#D4B483]/25 text-[#3B5249]/75 hover:bg-[#FAF6F0]"
            }`}
        >
          Published ({publishedCount})
        </button>
        <button
          onClick={() => setFilter("draft")}
          className={`px-4 py-2 rounded-lg transition-colors ${filter === "draft"
            ? "bg-[#3B5249] text-[#FAF6F0]"
            : "bg-white border border-[#D4B483]/25 text-[#3B5249]/75 hover:bg-[#FAF6F0]"
            }`}
        >
          Drafts ({draftCount})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-[#3B5249]/30 mb-4" size={48} />
            <p className="text-[#3B5249]/60">
              {filter === "all"
                ? "No blog posts yet. Create your first post to get started."
                : filter === "published"
                  ? "No published posts."
                  : "No draft posts."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#D4B483]/15">
            {filteredPosts.map((post) => (
              <div
                key={post._id}
                onDragOver={
                  filter === "all"
                    ? (e) => handleDragOver(e, list.indexOf(post))
                    : undefined
                }
                className="p-6 flex items-start gap-4 hover:bg-[#FAF6F0]/70 transition-colors"
              >
                <div
                  className={`${filter === "all"
                    ? "text-[#3B5249]/35 cursor-grab active:cursor-grabbing"
                    : "text-[#3B5249]/20 cursor-not-allowed"
                    }`}
                  title={
                    filter === "all"
                      ? "Drag to reorder"
                      : "Switch to All to reorder"
                  }
                  draggable={filter === "all"}
                  onDragStart={() =>
                    filter === "all"
                      ? handleDragStart(list.indexOf(post))
                      : undefined
                  }
                  onDragEnd={() =>
                    filter === "all" ? void handleDragEnd() : undefined
                  }
                >
                  <GripVertical size={20} />
                </div>
                {/* Thumbnail */}
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-[#FAF6F0] border border-[#D4B483]/15 flex-shrink-0">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#3B5249] truncate">
                      {post.title}
                    </h3>
                    {!post.published && (
                      <span className="text-xs bg-[#D4B483]/20 text-[#68582E] px-2 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-[#3B5249]/65 text-sm line-clamp-1">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#3B5249]/55">
                    <span className="bg-[#FAF6F0] border border-[#D4B483]/20 px-2 py-0.5 rounded">
                      {post.category}
                    </span>
                    <span>{post.date}</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors"
                    title="View post"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    onClick={() => handleTogglePublished(post)}
                    className={`p-2 rounded-lg transition-colors ${post.published
                      ? "text-emerald-600 hover:bg-emerald-50"
                      : "text-[#3B5249]/40 hover:text-emerald-600 hover:bg-emerald-50"
                      }`}
                    title={post.published ? "Unpublish" : "Publish"}
                  >
                    {post.published ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <Link
                    href={`/admin/blog/${post._id}`}
                    className="p-2 text-[#3B5249]/40 hover:text-[#7B6E9E] hover:bg-[#7B6E9E]/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </Link>
                  <button
                    onClick={() => handleDeleteClick(post._id)}
                    className="p-2 text-[#3B5249]/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
