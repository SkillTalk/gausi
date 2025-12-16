import { Metadata } from 'next';
import { blogPosts } from '@/content/content';
import { SectionHeading } from '@/components/SectionHeading';
import { BlogCard } from '@/components/BlogCard';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'SEO basics and practical growth marketing tips.'
};

export default function BlogPage() {
  return (
    <section className="container pt-10">
      <SectionHeading title="Blog" subtitle="Practical SEO and growth insights." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {blogPosts.map((p) => (
          <BlogCard key={p.slug} post={p} />
        ))}
      </div>
    </section>
  );
}


