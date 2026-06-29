"use client";

import { useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { useRouter } from "next/navigation";
import BlogPostEditorPage, {
  BlogPostEditorValues,
} from "@/components/admin/blog/BlogPostEditorPage";
import { useAdminLanguage } from "@/components/admin/language/AdminLanguageProvider";

export default function NewBlogPostPage() {
  const router = useRouter();
  const { language } = useAdminLanguage();
  const createPost = useMutation(api.admin.createBlogPost);

  const initialValues = useMemo(
    (): BlogPostEditorValues => ({
      title: "",
      excerpt: "",
      category: "",
      image: "",
      imageBlurDataUrl: undefined,
      featuredImageStorageId: undefined,
      featuredImageAlt: "",
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      readTime: "",
      content: "",
      published: false,
      featured: false,
    }),
    [],
  );

  return (
    <BlogPostEditorPage
      mode="create"
      initialValues={initialValues}
      headerTitle="Create New Post"
      crumbLabel="New Post"
      onSubmit={async ({ values, slug, publish }) => {
        await createPost({
          lang: language ?? undefined,
          slug,
          title: values.title,
          excerpt: values.excerpt,
          category: values.category || "Not categorized",
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
