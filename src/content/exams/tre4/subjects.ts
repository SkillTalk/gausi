/**
 * BPSC TRE 4 — Subject-wise test series catalogue.
 *
 * These subjects appear on /tre4/subjects (public) and in the
 * /admin/subject-tests generate form.  They are intentionally kept
 * separate from tre4TopicGroups (topic-practice) to avoid overlap.
 */

export type SubjectInfo = {
  /** URL slug, e.g. "music" → /tre4/subjects/music */
  slug: string;
  /** Matches GeneratedTest.category in DB */
  category: string;
  /** English display name */
  label: string;
  /** Hindi display name */
  labelHi: string;
  /** Emoji icon */
  icon: string;
  /** Tailwind gradient classes for the subject card */
  gradient: string;
};

// ─── New specialist subjects (not in current topic-practice groups) ────────────
export const tre4SubjectSeries: SubjectInfo[] = [
  { slug: 'music',              category: 'Music',             label: 'Music',              labelHi: 'संगीत',           icon: '🎵', gradient: 'from-pink-400 to-rose-500'      },
  { slug: 'english',            category: 'English',           label: 'English',            labelHi: 'अंग्रेजी',        icon: '📖', gradient: 'from-blue-400 to-indigo-500'    },
  { slug: 'computer-science',   category: 'Computer Science',  label: 'Computer Science',   labelHi: 'कंप्यूटर विज्ञान', icon: '💻', gradient: 'from-cyan-400 to-teal-500'     },
  { slug: 'hindi',              category: 'Hindi',             label: 'Hindi',              labelHi: 'हिंदी',           icon: '🔤', gradient: 'from-orange-400 to-amber-500'   },
  { slug: 'sanskrit',           category: 'Sanskrit',          label: 'Sanskrit',           labelHi: 'संस्कृत',          icon: '📿', gradient: 'from-yellow-400 to-orange-500'  },
  { slug: 'urdu',               category: 'Urdu',              label: 'Urdu',               labelHi: 'उर्दू',           icon: '✍️', gradient: 'from-emerald-400 to-green-500'  },
  { slug: 'physical-education', category: 'Physical Education',label: 'Physical Education', labelHi: 'शारीरिक शिक्षा',   icon: '🏃', gradient: 'from-red-400 to-rose-500'       },
  { slug: 'home-science',       category: 'Home Science',      label: 'Home Science',       labelHi: 'गृह विज्ञान',      icon: '🏠', gradient: 'from-purple-400 to-violet-500'  },
  { slug: 'economics',          category: 'Economics',         label: 'Economics',          labelHi: 'अर्थशास्त्र',      icon: '📊', gradient: 'from-green-400 to-emerald-500'  },
  { slug: 'commerce',           category: 'Commerce',          label: 'Commerce',           labelHi: 'वाणिज्य',         icon: '💼', gradient: 'from-slate-400 to-slate-600'    },
  { slug: 'biology',            category: 'Biology',           label: 'Biology',            labelHi: 'जीव विज्ञान',      icon: '🌱', gradient: 'from-lime-400 to-green-500'     },
  { slug: 'chemistry',          category: 'Chemistry',         label: 'Chemistry',          labelHi: 'रसायन विज्ञान',    icon: '⚗️', gradient: 'from-violet-400 to-purple-500'  },
  { slug: 'physics',            category: 'Physics',           label: 'Physics',            labelHi: 'भौतिकी',          icon: '⚡', gradient: 'from-yellow-400 to-amber-500'   },
  { slug: 'political-science',  category: 'Political Science', label: 'Political Science',  labelHi: 'राजनीति विज्ञान',  icon: '🏛️', gradient: 'from-blue-500 to-indigo-600'    },
  { slug: 'maithili',           category: 'Maithili',          label: 'Maithili',           labelHi: 'मैथिली',          icon: '🗣️', gradient: 'from-teal-400 to-cyan-500'      },
  { slug: 'bengali',            category: 'Bengali',           label: 'Bengali',            labelHi: 'बंगाली',          icon: '🖊️', gradient: 'from-rose-400 to-pink-500'      },
];

/** All valid category values accepted by the subject-tests generate API */
export const SUBJECT_SERIES_CATEGORIES: string[] = tre4SubjectSeries.map((s) => s.category);

/** Quick lookup by URL slug */
export const tre4SubjectsBySlug: Record<string, SubjectInfo> = Object.fromEntries(
  tre4SubjectSeries.map((s) => [s.slug, s]),
);

/** Quick lookup by DB category string */
export const tre4SubjectsByCategory: Record<string, SubjectInfo> = Object.fromEntries(
  tre4SubjectSeries.map((s) => [s.category, s]),
);
