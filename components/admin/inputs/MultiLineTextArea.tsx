type MultiLineTextAreaProps = {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  label: string;
  rows?: number;
  required?: boolean;
  helpText?: string | null;
  error?: string;
};

const MultiLineTextArea = ({
  value,
  onChange,
  placeholder,
  label,
  rows = 3,
  required = false,
  helpText = "Hit enter to create multiple lines in the heading",
  error,
}: MultiLineTextAreaProps) => {
  const hasError = Boolean(error && error.trim().length > 0);
  return (
    <div>
      <label
        className={`block text-sm font-medium mb-2 ${hasError ? "text-red-600" : "text-[#3B5249]/85"
          }`.trim()}
      >
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={hasError}
        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-[#FAF6F0] text-[#3B5249] placeholder:text-[#3B5249]/40 ${hasError
            ? "border-red-500 focus:ring-red-500"
            : "border-[#D4B483]/35 focus:ring-[#7B6E9E]/30"
          }`.trim()}
        rows={rows}
        placeholder={placeholder}
      />
      {hasError ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
      {helpText ? (
        <p className="text-xs text-[#3B5249]/55 mt-1">{helpText}</p>
      ) : null}
    </div>
  );
};
export default MultiLineTextArea;
