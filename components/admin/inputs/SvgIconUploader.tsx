"use client";

import { useRef } from "react";
import { Upload, X } from "lucide-react";

type SvgIconUploaderProps = {
  label?: string;
  value?: string;
  onChange: (svg: string) => void;
  helpText?: string;
  error?: string;
};

export default function SvgIconUploader({
  label = "Icon",
  value,
  onChange,
  helpText = "Upload an SVG file. Icon is required.",
  error,
}: SvgIconUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasError = Boolean(error && error.trim().length > 0);

  const handleUpload = (file: File) => {
    if (file.type !== "image/svg+xml") {
      alert("Please upload an SVG file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const svg = e.target?.result as string;
      if (!svg || !svg.includes("<svg")) {
        alert("Invalid SVG file.");
        return;
      }
      onChange(svg);
    };
    reader.readAsText(file);
  };

  const handleRemove = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label
          className={`block text-sm font-medium ${hasError ? "text-red-600" : "text-[#3B5249]/85"
            }`.trim()}
        >
          {label}
        </label>
      )}

      <div className="flex items-center gap-4">
        <div
          className={`bg-[#FAF6F0] p-4 rounded-xl flex-shrink-0 border ${hasError ? "border-red-500" : "border-[#D4B483]/20"
            }`.trim()}
        >
          {value ? (
            <div
              className="w-8 h-8 text-[#7B6E9E] [&_svg]:w-full [&_svg]:h-full"
              aria-hidden
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <div className="w-8 h-8 rounded bg-[#D4B483]/25" />
          )}
        </div>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-invalid={hasError}
            className={`px-4 py-2 border rounded-lg hover:bg-[#7B6E9E]/8 transition-colors flex items-center gap-2 text-[#3B5249]/80 ${hasError ? "border-red-500" : "border-[#D4B483]/35"
              }`.trim()}
          >
            <Upload size={16} />
            Upload SVG
          </button>

          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {helpText && <p className="text-xs text-[#3B5249]/55">{helpText}</p>}

      {hasError ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
