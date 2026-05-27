interface TagBadgeProps {
  name: string;
  color: string; // hex
  onRemove?: () => void;
  size?: "sm" | "md";
}

export function TagBadge({ name, color, onRemove, size = "md" }: TagBadgeProps) {
  const bg  = `${color}1a`; // ~10% opacity
  const border = `${color}40`; // ~25% opacity

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"}`}
      style={{ backgroundColor: bg, color, borderColor: border }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {name}
      {onRemove && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color }}
        >
          ×
        </button>
      )}
    </span>
  );
}
