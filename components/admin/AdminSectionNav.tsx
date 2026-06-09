"use client";

export type AdminSection = {
  key: string;
  label: string;
};

type AdminSectionNavProps = {
  sections: AdminSection[];
  activeSection: string;
  onChange: (key: string) => void;
  title?: string;
};

export function AdminSectionNav({
  sections,
  activeSection,
  onChange,
  title = "Sections",
}: AdminSectionNavProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#D4B483]/20 shadow-sm p-4">
      <h3 className="font-semibold text-[#3B5249] mb-4 [font-family:Georgia,serif]">
        {title}
      </h3>

      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => onChange(section.key)}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeSection === section.key
                ? "bg-[#3B5249] text-[#FAF6F0]"
                : "text-[#3B5249]/80 hover:bg-[#7B6E9E]/8"
              }`}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
