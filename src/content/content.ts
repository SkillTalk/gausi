export type Service = {
  slug: string;
  title: string;
  short: string;
  description: string;
  outcomes: string[];
  deliverables: string[];
  timeline: string;
  startingPrice: string;
  faq?: { q: string; a: string }[];
};

export type CaseStudy = {
  slug: string;
  title: string;
  industry: string;
  problem: string;
  approach: string[];
  result: string[];
  metrics: { label: string; value: string }[];
};

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  tags?: string[];
};

export const siteConfig = {
  name: 'Gausi Digital Marketing',
  taglineMain: 'Gausi Digital Marketing — SEO that brings real customers.',
  subtext:
    'We help startups and local businesses grow with SEO, content, and performance marketing. Practical, transparent, and results-focused.',
  taglines: [
    'Rank Higher. Grow Faster.',
    'SEO & Growth Marketing for Small Businesses.',
    'Simple strategies. Real results.'
  ],
  url: 'https://gausidigital.com', // live domain
  ogImage: '/og-image.svg',
  contact: {
    email: 'hello@gausidigital.com',
    whatsapp: 'https://wa.me/0000000000',
    location: 'India (remote)'
  },
  social: {
    twitter: '#',
    linkedin: '#'
  },
  nav: [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/case-studies', label: 'Case Studies' },
    { href: '/blog', label: 'Blog' },
    { href: '/about', label: 'About' }
  ],
  cta: {
    primary: { href: '/free-audit', label: 'Get a Free Audit' },
    secondary: { href: '/contact', label: 'Book a Call' }
  },
  stats: [
    { label: 'Audits delivered', value: '30+' },
    { label: 'Growth plan', value: '90-day' },
    { label: 'Client retention', value: '92%' }
  ],
  faq: [
    {
      q: 'How long does SEO take?',
      a:
        'Initial improvements often appear in 6–8 weeks. Sustainable growth typically compounds over 3–6 months depending on competition and current site health.'
    },
    {
      q: 'Do you guarantee #1 rankings?',
      a:
        'No. Ethical SEOs never guarantee rankings. We guarantee transparent work, clear KPIs, and consistent progress toward qualified traffic and leads.'
    },
    {
      q: 'What do you need from me to start?',
      a:
        'Access to your website/CMS, analytics, and Search Console. We also request a brief about your audience, offers, and business goals.'
    },
    {
      q: 'Is SEO good for small businesses?',
      a:
        'Yes. Local and niche SEO can be highly effective for small businesses when paired with simple, consistent content and reviews.'
    },
    {
      q: 'What’s included in the free audit?',
      a:
        'A quick technical and on-page review, opportunity highlights, competitor snapshot, and actionable next steps you can implement right away.'
    },
    {
      q: 'Do you also do social media and ads?',
      a:
        'Yes. We provide Social Media Marketing and Google Ads as growth accelerators alongside core SEO and content strategy.'
    }
  ]
};

export const services: Service[] = [
  {
    slug: 'seo',
    title: 'SEO',
    short: 'Improve visibility, traffic, and leads with a 90-day SEO roadmap.',
    description:
      'Full-stack SEO including technical, on-page, and content to drive qualified, compounding organic growth.',
    outcomes: [
      'Higher rankings for valuable keywords',
      'Increased qualified organic traffic',
      'Better conversion from search'
    ],
    deliverables: [
      'Technical audit & fixes',
      'Keyword & competitor research',
      'On-page optimization',
      'Content plan & briefs',
      'Reporting & iteration'
    ],
    timeline: '90-day roadmap with weekly/bi-weekly sprints',
    startingPrice: '₹ 35,000+ / month',
    faq: siteConfig.faq
  },
  {
    slug: 'local-seo',
    title: 'Local SEO',
    short: 'Get found on Google Maps and local searches.',
    description:
      'Maps optimization and local intent coverage to capture high-intent searches in your service area.',
    outcomes: ['More calls and visits', 'Higher Maps visibility', 'Improved local reputation'],
    deliverables: [
      'Google Business Profile optimization',
      'Local landing pages',
      'Citations & NAP consistency',
      'Reviews strategy',
      'Monthly reporting'
    ],
    timeline: '6–12 weeks for initial lift, compounding with reviews',
    startingPrice: '₹ 25,000+ / month'
  },
  {
    slug: 'content-strategy',
    title: 'Content Strategy',
    short: 'Content that ranks and converts.',
    description:
      'Content pillars and briefs aligned to search intent and business goals to drive qualified traffic and leads.',
    outcomes: ['Authority and topical coverage', 'Organic traffic growth', 'Better conversions'],
    deliverables: [
      'Content audit',
      'Keyword mapping & clustering',
      'Editorial calendar',
      'SEO briefs',
      'Performance tracking'
    ],
    timeline: '6–10 weeks to publish first cluster',
    startingPrice: '₹ 30,000+ / month'
  },
  {
    slug: 'social-media',
    title: 'Social Media Marketing',
    short: 'Consistent content + growth-focused engagement.',
    description:
      'Consistent brand presence with strategic content that supports trust and drives awareness.',
    outcomes: ['Brand visibility', 'Community engagement', 'Trust & recall'],
    deliverables: [
      'Content calendar',
      'Creatives & captions',
      'Page optimization',
      'Monthly reporting'
    ],
    timeline: 'Ongoing monthly engagement',
    startingPrice: '₹ 20,000+ / month'
  },
  {
    slug: 'google-ads',
    title: 'Google Ads',
    short: 'Paid campaigns optimized for ROI.',
    description:
      'Search and Performance Max campaigns focused on profitable growth with continuous testing.',
    outcomes: ['Qualified leads quickly', 'Controlled spend', 'Clear ROI tracking'],
    deliverables: [
      'Campaign setup',
      'Ad groups & keywords',
      'Ad copy & extensions',
      'Weekly optimizations',
      'Conversion tracking'
    ],
    timeline: '1–2 weeks for launch; weekly optimization',
    startingPrice: '₹ 25,000+ / month (excl. ad spend)'
  }
];

export const caseStudies: CaseStudy[] = [
  {
    slug: 'local-services-leads',
    title: 'Local Services — Consistent Leads in 8 Weeks',
    industry: 'Local Services',
    problem:
      'Low local visibility and inconsistent calls despite good reviews. No structured on-page optimization.',
    approach: [
      'Optimized Google Business Profile',
      'Built service + city landing pages',
      'Citations and reviews playbook',
      'On-page cleanup and internal links'
    ],
    result: [
      'Ranked top-3 for 12 local-intent terms',
      '30–45% lift in calls from Maps',
      'Sustained weekly inbound leads'
    ],
    metrics: [
      { label: 'Top-3 rankings', value: '12+' },
      { label: 'Calls from GBP', value: '+45%' },
      { label: 'Organic leads', value: '+38%' }
    ]
  },
  {
    slug: 'startup-organic-growth',
    title: 'Startup — Early Organic Traction',
    industry: 'SaaS/Startup',
    problem:
      'New domain with minimal authority; content scattered and no keyword mapping. Needed quick traction.',
    approach: [
      'Keyword research & clustering',
      'On-page and technical fixes',
      'Published 10 product-led blogs',
      'Topical internal linking'
    ],
    result: [
      'Early traffic and demo requests',
      'Improved crawl & indexation',
      'Foundational topical authority'
    ],
    metrics: [
      { label: 'Clicks (90d)', value: '+120%' },
      { label: 'Indexed pages', value: '+35%' },
      { label: 'Demo requests', value: '+22%' }
    ]
  },
  {
    slug: 'ecommerce-seo-quality-traffic',
    title: 'E-commerce — Better Traffic Quality',
    industry: 'E-commerce',
    problem:
      'Traffic growing but poor conversion from search; thin product/category content and weak internal linking.',
    approach: [
      'Template-level on-page SEO',
      'Content for categories and PDPs',
      'Fix duplicate parameters',
      'Strengthened internal links'
    ],
    result: [
      'Improved rankings for high-intent terms',
      'Higher add-to-cart rate from organic',
      'Cleaner crawl and indexation'
    ],
    metrics: [
      { label: 'Revenue (organic)', value: '+18%' },
      { label: 'Add-to-cart', value: '+22%' },
      { label: 'Indexed bloat', value: '-30%' }
    ]
  }
];

export const blogPosts: BlogPost[] = [
  {
    slug: 'seo-101-basics-for-small-businesses',
    title: 'SEO 101: Basics for Small Businesses',
    date: '2025-01-05',
    excerpt:
      'A simple, practical introduction to SEO for small businesses that want to attract real customers.',
    content:
      [
        'Search Engine Optimization (SEO) helps people find your business when they search. The goal is not just more traffic—it’s better traffic that converts.',
        '',
        'Start with three pillars:',
        '',
        '1) Technical: Make sure Google can crawl and index your site. Fix broken links, add sitemaps, and ensure fast load times.',
        '2) On-page: Use clear page titles, headings, and relevant keywords. Each page should target a specific intent.',
        '3) Content: Publish helpful, focused content that answers real questions your customers have.',
        '',
        'Keep it simple: consistent publishing + on-page hygiene + internal links. Measure progress in Search Console and analytics, not just rank trackers.'
      ].join('\\n'),
    tags: ['SEO', 'Small Business']
  },
  {
    slug: 'keyword-research-made-simple',
    title: 'Keyword Research Made Simple',
    date: '2025-01-10',
    excerpt:
      'Find what your customers actually search for and map keywords to pages for clarity and results.',
    content:
      [
        'A practical approach to keyword research focuses on intent and mapping—not endless lists.',
        '',
        'Steps:',
        '- Brainstorm seed topics from your services and FAQs.',
        '- Use tools (free or paid) to find related queries and volumes.',
        '- Group keywords by intent and create a map: one page for one primary intent.',
        '',
        'Outcome: Clear site structure and content roadmap that compels action.'
      ].join('\\n'),
    tags: ['SEO', 'Keyword Research']
  },
  {
    slug: 'on-page-seo-checklist',
    title: 'On-Page SEO Checklist',
    date: '2025-01-15',
    excerpt:
      'A concise checklist to keep every page aligned to search intent and user needs.',
    content:
      [
        'Use this lightweight checklist for every page:',
        '',
        '- Unique title and meta description',
        '- H1 matches the core topic; use H2s for structure',
        '- Clear primary keyword and synonyms in body',
        '- Descriptive internal links; add relevant outbound links',
        '- Optimized images with alt text',
        '- Fast load and mobile-friendly layout',
        '',
        'Ship, measure, iterate.'
      ].join('\\n'),
    tags: ['On-page SEO']
  },
  {
    slug: 'local-seo-google-business-profile',
    title: 'Local SEO: Google Business Profile Essentials',
    date: '2025-01-20',
    excerpt:
      'Simple optimizations to boost visibility in Maps and local results.',
    content:
      [
        'Your Google Business Profile (GBP) is mission-critical for local intent.',
        '',
        'Do this well:',
        '- Complete every field and keep NAP consistent',
        '- Choose accurate categories',
        '- Add products/services and photos',
        '- Post updates and collect reviews consistently',
        '',
        'Pair GBP with location pages and you’ll earn more calls and visits.'
      ].join('\\n'),
    tags: ['Local SEO']
  },
  {
    slug: 'content-that-ranks-and-converts',
    title: 'Content That Ranks and Converts',
    date: '2025-01-25',
    excerpt:
      'Turn search demand into customers with helpful, intent-aligned content.',
    content:
      [
        'High-performing content is helpful, specific, and aligned to intent.',
        '',
        'Framework:',
        '- Start with a question or pain point',
        '- Show a simple step-by-step solution',
        '- Offer a template or checklist',
        '- Link to a relevant product or service',
        '',
        'Consistency beats perfection. Publish, learn, and improve.'
      ].join('\\n'),
    tags: ['Content Strategy']
  }
];


