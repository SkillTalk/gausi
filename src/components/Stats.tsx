export function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map((s) => (
        <div key={s.label} className="card p-5 text-center">
          <div className="text-2xl font-semibold">{s.value}</div>
          <div className="text-white/70 text-sm mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}


