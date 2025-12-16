export function TestimonialCard({ quote, author }: { quote: string; author: string }) {
  return (
    <div className="card p-6">
      <p className="text-white/90">&ldquo;{quote}&rdquo;</p>
      <p className="mt-4 text-sm text-white/60">— {author}</p>
    </div>
  );
}


