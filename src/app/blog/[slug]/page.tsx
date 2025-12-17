import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blogPosts } from '@/content/content';
import { formatDate } from '@/lib/utils';
import { ReadingProgress } from '@/components/ReadingProgress';
import { AISummary } from '@/components/AISummary';
import type { ReactNode } from 'react';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return blogPosts.map((b) => ({ slug: b.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = blogPosts.find((b) => b.slug === params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt
  };
}

function renderContent(content: string) {
  // very lightweight rendering: paragraphs + simple lists
  const lines = content.split('\\n');
  const elements: ReactNode[] = [];
  let listBuffer: string[] = [];
  lines.forEach((line, idx) => {
    if (line.trim().startsWith('- ')) {
      listBuffer.push(line.trim().slice(2));
    } else {
      if (listBuffer.length > 0) {
        elements.push(
          <ul key={`ul-${idx}`}>
            {listBuffer.map((li, i) => (
              <li key={i}>{li}</li>
            ))}
          </ul>
        );
        listBuffer = [];
      }
      if (line.trim().length > 0) {
        elements.push(<p key={`p-${idx}`}>{line}</p>);
      } else {
        elements.push(<div key={`sp-${idx}`} className="h-1" />);
      }
    }
  });
  if (listBuffer.length > 0) {
    elements.push(
      <ul key="ul-last">
        {listBuffer.map((li, i) => (
          <li key={i}>{li}</li>
        ))}
      </ul>
    );
  }
  return elements;
}

export default function BlogDetailPage({ params }: Props) {
  const post = blogPosts.find((b) => b.slug === params.slug);
  if (!post) return notFound();
  return (
    <section className="container pt-10">
      <ReadingProgress />
      <article className="max-w-3xl">
        <div className="text-sm text-white/60">{formatDate(post.date)}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
        <AISummary excerpt={post.excerpt} />
        <div className="mt-6 prose">{renderContent(post.content)}</div>
      </article>
    </section>
  );
}


