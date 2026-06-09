"use client";

type ButtonFieldProps = {
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

export default function ButtonField({
  text = "",
  link = "",
  onTextChange,
  onLinkChange,
  textLabel = "Button text",
  linkLabel = "Button link",
  textPlaceholder = "Button text",
  linkPlaceholder = "/page",
  textError,
  linkError,
}: ButtonFieldProps) {
  const hasTextError = Boolean(textError && textError.trim().length > 0);
  const hasLinkError = Boolean(linkError && linkError.trim().length > 0);
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${hasTextError ? "text-red-600" : "text-[#3B5249]/85"
            }`.trim()}
        >
          {textLabel}
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={textPlaceholder}
          aria-invalid={hasTextError}
          className={`w-full px-4 py-2.5 border rounded-xl bg-[#FAF6F0] text-[#3B5249] placeholder:text-[#3B5249]/40
                     focus:outline-none focus:ring-2 focus:border-transparent
                     ${hasTextError
              ? "border-red-500 focus:ring-red-500"
              : "border-[#D4B483]/35 focus:ring-[#7B6E9E]/30"
            }`.trim()}
        />
        {hasTextError ? (
          <p className="text-xs text-red-600 mt-1">{textError}</p>
        ) : null}
      </div>

      <div>
        <label
          className={`block text-sm font-medium mb-2 ${hasLinkError ? "text-red-600" : "text-[#3B5249]/85"
            }`.trim()}
        >
          {linkLabel}
        </label>
        <input
          type="text"
          value={link}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder={linkPlaceholder}
          aria-invalid={hasLinkError}
          className={`w-full px-4 py-2.5 border rounded-xl bg-[#FAF6F0] text-[#3B5249] placeholder:text-[#3B5249]/40
                     focus:outline-none focus:ring-2 focus:border-transparent
                     ${hasLinkError
              ? "border-red-500 focus:ring-red-500"
              : "border-[#D4B483]/35 focus:ring-[#7B6E9E]/30"
            }`.trim()}
        />
        {hasLinkError ? (
          <p className="text-xs text-red-600 mt-1">{linkError}</p>
        ) : null}
      </div>
    </div>
  );
}
