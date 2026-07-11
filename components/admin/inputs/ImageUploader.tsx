"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { Id } from "@/convex/_generated/dataModel";

type ImageUploaderProps = {
  label: string;
  storageId?: Id<"_storage">;
  alt?: string;
  blurDataUrl?: string;
  onImageChange: (storageId?: Id<"_storage">) => void;
  onAltChange?: (alt: string) => void;
  onBlurDataUrlChange?: (blurDataUrl?: string) => void;
  accept?: string;
  previewSize?: number;
  helpText?: string;
  error?: string;
  altError?: string;
  hideAlt?: boolean;
};

// Raster formats we can safely re-encode. SVG/GIF are left untouched to avoid
// breaking vector scaling or animation.
const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Only compress when the file is heavier than this…
const COMPRESS_SIZE_THRESHOLD = 1024 * 1024; // 1 MB
// …or larger than this on its longest edge.
const MAX_IMAGE_DIMENSION = 2000; // px
const OUTPUT_QUALITY = 0.82;

/**
 * Downscale + re-encode oversized images before upload so we never store
 * multi-megabyte originals. Returns the original file untouched when it is
 * already small enough, not a raster image, or if compression fails/grows it.
 */
async function compressImageIfNeeded(
  file: File,
): Promise<{ body: Blob; type: string }> {
  if (!COMPRESSIBLE_TYPES.has(file.type)) {
    return { body: file, type: file.type };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const needsResize = longestEdge > MAX_IMAGE_DIMENSION;
    const needsRecompress = file.size > COMPRESS_SIZE_THRESHOLD;

    if (!needsResize && !needsRecompress) {
      bitmap.close?.();
      return { body: file, type: file.type };
    }

    const scale = needsResize ? MAX_IMAGE_DIMENSION / longestEdge : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return { body: file, type: file.type };
    }

    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    // WebP keeps alpha (unlike JPEG) and compresses photos very well.
    const outputType = "image/webp";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), outputType, OUTPUT_QUALITY),
    );

    // Only keep the re-encoded version if it is actually smaller.
    if (blob && blob.size < file.size) {
      return { body: blob, type: outputType };
    }
    return { body: file, type: file.type };
  } catch {
    return { body: file, type: file.type };
  }
}

async function generateBlurDataUrlFromFile(
  file: File,
): Promise<string | undefined> {
  try {
    // Prefer createImageBitmap (fast + avoids layout).
    const bitmap = await createImageBitmap(file);
    const maxSize = 24;
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    ctx.drawImage(bitmap, 0, 0, w, h);

    // JPEG is usually smaller; quality kept low intentionally.
    return canvas.toDataURL("image/jpeg", 0.6);
  } catch {
    // Fallback path: try with an Image element.
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = "async";
      img.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const maxSize = 24;
      const scale = Math.min(
        1,
        maxSize / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;

      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objectUrl);

      return canvas.toDataURL("image/jpeg", 0.6);
    } catch {
      return undefined;
    }
  }
}

export default function ImageUploader({
  label,
  storageId,
  alt = "",
  onImageChange,
  onAltChange,
  onBlurDataUrlChange,
  accept = "image/*",
  previewSize = 80,
  helpText,
  error,
  altError,
  hideAlt,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const imageUrl = useQuery(
    api.media.getFileUrl,
    storageId ? { storageId } : "skip",
  );

  const hasError = Boolean(error && error.trim().length > 0);
  const hasAltError = Boolean(altError && altError.trim().length > 0);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);

      const blur = await generateBlurDataUrlFromFile(file);
      if (onBlurDataUrlChange) {
        onBlurDataUrlChange(blur);
      }

      const { body, type } = await compressImageIfNeeded(file);

      const uploadUrl = await generateUploadUrl();

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": type },
        body,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { storageId } = await res.json();
      onImageChange(storageId);

      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onImageChange(undefined);
    onAltChange?.(""); // alt törlés is
    if (onBlurDataUrlChange) {
      onBlurDataUrlChange(undefined);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3 w-full min-w-0">
      <label
        className={`block text-sm font-medium ${hasError ? "text-red-600" : "text-[#3B5249]/85"
          }`.trim()}
      >
        {label}
      </label>

      {imageUrl ? (
        <>
          {/* Preview + actions */}
          <div className="flex flex-col gap-y-4 md:items-center gap-4 sm:flex-row">
            <div
              className="bg-[#FAF6F0] border border-[#D4B483]/20 rounded-xl overflow-hidden flex items-center justify-center max-w-full aspect-square"
              style={{ maxWidth: previewSize }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={alt || "Uploaded image"}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 md:w-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-sm bg-[#7B6E9E]/10 text-[#3B5249] border border-[#7B6E9E]/20 hover:bg-[#7B6E9E]/15 rounded-lg max-w-full"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Alt text – always shown when image exists */}
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${hasAltError ? "text-red-600" : "text-[#3B5249]/70"
                }`.trim()}
            >
              Image alt text
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => onAltChange?.(e.target.value)}
              placeholder="Describe the image…"
              aria-invalid={hasAltError}
              className={`w-full px-3 py-2 border rounded-lg
                         focus:outline-none focus:ring-2 focus:border-transparent text-sm
                         ${hasAltError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-[#D4B483]/35 bg-[#FAF6F0] text-[#3B5249] placeholder:text-[#3B5249]/40 focus:ring-[#7B6E9E]/30"
                }`.trim()}
            />
            {hasAltError ? (
              <p className="text-xs text-red-600 mt-1">{altError}</p>
            ) : null}
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          aria-invalid={hasError}
          className={`w-full px-4 py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-[#3B5249]/75 hover:bg-[#7B6E9E]/5 ${hasError ? "border-red-500" : "border-[#D4B483]/35 hover:border-[#7B6E9E]/40"
            }`.trim()}
        >
          {uploading ? (
            <>
              <div className="animate-spin h-4 w-4 border-b-2 border-[#7B6E9E]" />
              Uploading…
            </>
          ) : (
            <>
              <Upload size={18} />
              Upload image
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
        className="hidden"
      />

      {helpText && <p className="text-xs text-[#3B5249]/55">{helpText}</p>}

      {hasError ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
