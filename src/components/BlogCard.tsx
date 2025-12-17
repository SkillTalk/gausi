import Link from 'next/link';
import type { Route } from 'next';
import { BlogPost } from '@/content/content';
import { formatDate } from '@/lib/utils';

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <div className="card p-6 flex flex-col">
      <div className="text-sm text-white/60">{formatDate(post.date)}</div>
      <h3 className="mt-1 text-lg font-semibold">
        <Link href={`/blog/${post.slug}` as Route} className="hover:underline">
          {post.title}
        </Link>
      </h3>
      <p className="mt-2 text-white/80">{post.excerpt}</p>
      <div className="mt-4 text-sm">
        <Link href={`/blog/${post.slug}` as Route} className="text-electric-400 hover:text-electric-300">
          Read more →
        </Link>
      </div>
    </div>
  );
}


