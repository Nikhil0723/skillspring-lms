type BrandProps = {
  showTagline?: boolean;
  onSidebar?: boolean;
  className?: string;
  markClassName?: string;
};

export function BrandMark({ className = "size-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="SkillSpring logo"
      className={className}>
      <rect width="48" height="48" rx="14" fill="#16333B" />
      <path
        d="M9 17.5c5.4-2.6 10.5-2.1 15 1.3 4.5-3.4 9.6-3.9 15-1.3v18c-5.4-2.6-10.5-2.1-15 1.3-4.5-3.4-9.6-3.9-15-1.3v-18Z"
        stroke="#DDF5EE"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M24 18.8v18" stroke="#DDF5EE" strokeWidth="2.5" />
      <path
        d="m17 28 5-5 4 3 6-8"
        stroke="#59D9AD"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m28 18 4 0 0 4" stroke="#59D9AD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Brand({
  showTagline = false,
  onSidebar = false,
  className = "",
  markClassName = "size-10",
}: BrandProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className={`${markClassName} shrink-0`} />
      <span className="flex flex-col leading-tight">
        <span className={`text-lg font-bold tracking-tight ${onSidebar ? "text-sidebar-foreground" : "text-foreground"}`}>
          Skill<span className="text-primary">Spring</span>
        </span>
        {showTagline && (
          <span className="hidden text-[11px] text-muted-foreground md:block">
            Grow into what&apos;s next
          </span>
        )}
      </span>
    </span>
  );
}
