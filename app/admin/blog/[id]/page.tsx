"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";

import BlogPostEditorPage, {
  BlogPostEditorValues,
} from "@/components/admin/blog/BlogPostEditorPage";

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const post = useQuery(api.admin.getBlogPostAdmin, {
    id: params.id as Id<"blogPosts">,
  });

  const updatePost = useMutation(api.admin.updateBlogPost);

  const initialValues = useMemo((): BlogPostEditorValues | null => {
    if (!post) return null;
    return {
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      image: post.image,
      imageBlurDataUrl: (post as any).imageBlurDataUrl,
      featuredImageStorageId: undefined,
      featuredImageAlt: (post as any).imageAlt ?? "",
      date: post.date,
      readTime: post.readTime,
      content: post.content,
      published: post.published,
      featured: (post as any).featured ?? false,
    };
  }, [post]);

  if (post === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7B6E9E]"></div>
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-8">
        <h1 className="text-2xl [font-family:Georgia,serif] font-medium text-[#3B5249]">Post not found</h1>
        <p className="text-[#3B5249]/65 mt-2">This post may have been deleted.</p>
        <Link
          href="/admin/blog"
          className="text-[#7B6E9E] underline mt-4 inline-block"
        >
          Back to Blog Posts
        </Link>
      </div>
    );
  }

  if (!initialValues) return null;

  return (
    <BlogPostEditorPage
      mode="edit"
      initialValues={initialValues}
      headerTitle="Edit Post"
      crumbLabel="Edit"
      onSubmit={async ({ values, slug, publish }) => {
        await updatePost({
          id: params.id as Id<"blogPosts">,
          slug,
          title: values.title,
          excerpt: values.excerpt,
          category: values.category,
          image: values.image,
          imageAlt: values.featuredImageAlt,
          imageBlurDataUrl: values.imageBlurDataUrl,
          date: values.date,
          readTime: values.readTime,
          content: values.content,
          published: publish,
          featured: values.featured,
        });
        router.push("/admin/blog");
      }}
    />
  );
}
