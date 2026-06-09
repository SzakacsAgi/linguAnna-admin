"use client";

import GeneralInput from "@/components/admin/inputs/GeneralInput";
import RichTextEditor from "@/components/admin/inputs/RichTextEditor";
import ButtonField from "@/components/admin/inputs/ButtonField";

type RichTool = "bold" | "italic" | "link";

type CtaButton = {
  text?: string;
  link?: string;
  onTextChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  textLabel?: string;
  linkLabel?: string;
  textPlaceholder?: string;
  linkPlaceholder?: string;
  textError?: string;
  linkError?: string;
};

type CTAProps = {
  title: string;
  onTitleChange: (value: string) => void;

  titleError?: string;

  description: string;
  onDescriptionChange: (value: string) => void;
  editorKey: string;

  descriptionError?: string;

  buttons: CtaButton[];

  titleLabel?: string;
  titlePlaceholder?: string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  tools?: RichTool[];
};

export default function CTA({
  title,
  onTitleChange,
  titleError,
  description,
  onDescriptionChange,
  editorKey,
  descriptionError,
  buttons,
  titleLabel = "Title",
  titlePlaceholder = "CTA title...",
  descriptionLabel = "Description",
  descriptionPlaceholder = "CTA description...",
  tools = ["bold", "italic", "link"],
}: CTAProps) {
  return (
    <div className="space-y-6">
      <GeneralInput
        label={titleLabel}
        placeholder={titlePlaceholder}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        error={titleError}
      />

      <RichTextEditor
        label={descriptionLabel}
        editorKey={editorKey}
        value={description}
        onChange={onDescriptionChange}
        placeholder={descriptionPlaceholder}
        tools={tools}
        error={descriptionError}
      />

      {buttons.length > 0 ? (
        <div className="space-y-4">
          {buttons.map((button, index) => (
            <ButtonField
              key={index}
              text={button.text}
              link={button.link}
              onTextChange={button.onTextChange}
              onLinkChange={button.onLinkChange}
              textLabel={button.textLabel}
              linkLabel={button.linkLabel}
              textPlaceholder={button.textPlaceholder}
              linkPlaceholder={button.linkPlaceholder}
              textError={button.textError}
              linkError={button.linkError}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
