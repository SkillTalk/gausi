import type { Route } from 'next';

export const siteConfig = {
  name: 'GAUSI',
  fullForm: "Government Aspirants' Unified Study Institute",
  tagline: 'Learn • Practice • Succeed',
  description:
    'Practice BPSC TRE and other government exam questions with daily tests, topic-wise practice, detailed results and revision tools.',
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
