export function ProcessSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {steps.map((s, idx) => (
        <li key={s} className="card p-5">
          <div className="text-white/60 text-sm">Step {idx + 1}</div>
          <div className="mt-1 font-semibold">{s}</div>
        </li>
      ))}
    </ol>
  );
}


