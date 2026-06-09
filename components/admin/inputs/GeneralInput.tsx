import { ChangeEvent, HTMLInputTypeAttribute } from "react";

type GeneralInputProps = {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  label?: string;
  type?: HTMLInputTypeAttribute;
  disabled?: boolean;
  inputClassName?: string;
  required?: boolean;
  error?: string;
};

const GeneralInput = ({
  value,
  onChange,
  placeholder,
  label,
  type = "text",
  disabled = false,
  inputClassName,
  required = false,
  error,
}: GeneralInputProps) => {
  const hasError = Boolean(error && error.trim().length > 0);
  return (
    <div className="space-y-2">
      {label ? (
        <label
          className={`block text-sm font-medium ${hasError ? "text-red-600" : "text-[#3B5249]/85"
            }`.trim()}
        >
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </label>
      ) : null}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={hasError}
        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-[#FAF6F0] text-[#3B5249] placeholder:text-[#3B5249]/40 ${hasError
            ? "border-red-500 focus:ring-red-500"
            : "border-[#D4B483]/35 focus:ring-[#7B6E9E]/30"
          } ${disabled ? "bg-[#FAF6F0]/60 text-[#3B5249]/40" : ""
          } ${inputClassName || ""}`}
      />

      {hasError ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
};

export default GeneralInput;
