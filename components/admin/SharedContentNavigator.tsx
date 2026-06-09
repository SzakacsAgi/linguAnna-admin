import { ExternalLink } from "lucide-react";
import Link from "next/link";

type SharedContentNavigatorProps = {
  href: string;
  navLabel: string;
  textBeforNav: string;
};

const SharedContentNavigator = ({ href, navLabel, textBeforNav }: SharedContentNavigatorProps) => {
  return (
    <div className="text-sm flex items-center gap-1.5 text-[#3B5249]/70">
      {textBeforNav}{" "}
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:no-underline text-[#7B6E9E] transition-colors"
      >
        <ExternalLink size={14} />
        <span>{navLabel}</span>
      </Link>
    </div>
  )
}

export default SharedContentNavigator;