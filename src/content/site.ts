import type { Route } from 'next';

export const siteConfig = {
  name: 'Gausi Digital',
  tagline: 'BPSC • TRE • Bihar Exams',
  description:
    'Prepare smarter for BPSC TRE 4 with daily practice sets, topic-wise tests, and timed mock exams in Hindi & English.',
  url: 'https://gausidigital.com',
  ogImage: '/og-image.svg',
  contact: {
    email: 'hello@gausidigital.com',
    location: 'India (remote)',
  },
  social: {
    twitter: '#',
    linkedin: '#',
  },
  nav: [
    { href: '/' as Route, label: 'Home' },
    { href: '/tre4' as Route, label: 'BPSC TRE 4' },
    { href: '/tre4/topics' as Route, label: 'Topics' },
    { href: '/tre4/daily' as Route, label: 'Daily Tests' },
  ],
  cta: {
    primary: { href: '/tre4/daily' as Route, label: "Start Today's Test" },
    secondary: { href: '/tre4/topics' as Route, label: 'Browse Topics' },
  },
} as const;
