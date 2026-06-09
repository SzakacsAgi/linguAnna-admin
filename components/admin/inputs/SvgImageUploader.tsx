"use client";

import { Id } from "@/convex/_generated/dataModel";
import ImageUploader from "@/components/admin/inputs/ImageUploader";

type SvgImageUploaderProps = {
    label: string;
    storageId?: Id<"_storage">;
    alt?: string;
    onImageChange: (storageId?: Id<"_storage">) => void;
    onAltChange: (alt: string) => void;
    previewSize?: number;
    error?: string;
    altError?: string;
};

export default function SvgImageUploader({
    label,
    storageId,
    alt,
    onImageChange,
    onAltChange,
    previewSize = 96,
    error,
    altError,
}: SvgImageUploaderProps) {
    return (
        <ImageUploader
            label={label}
            storageId={storageId}
            alt={alt}
            onImageChange={onImageChange}
            onAltChange={onAltChange}
            accept=".svg,image/svg+xml"
            previewSize={previewSize}
            helpText="Only SVG files are allowed."
            error={error}
            altError={altError}
        />
    );
}
