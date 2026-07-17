export default function FillBar({ percent }: { percent: number }) {
  const full = percent >= 100;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-hairline">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          full ? "bg-ok-600" : "bg-gradient-to-r from-brand-400 to-brand-500"
        }`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}
