import { Flower2 } from "lucide-react";

export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true"><Flower2 size={compact ? 21 : 25} strokeWidth={1.8} /></span>
      <span className="brand-copy">
        <strong>SafeHer</strong>
        {!compact && <small>SUPPORT · DIGNITY · CHOICE</small>}
      </span>
    </div>
  );
}
