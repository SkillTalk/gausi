import type { TopicGroup } from '@/types/exam';

export const tre4TopicGroups: TopicGroup[] = [
  {
    id: 'history',
    label: 'History',
    labelHi: 'इतिहास',
    color: 'from-amber-500 to-orange-500',
    dbCategory: 'History',
    topics: [
      { id: 'revolt-1857', label: 'Revolt of 1857', labelHi: '1857 का विद्रोह', available: true },
      { id: 'national-movement', label: 'Indian National Movement', labelHi: 'भारतीय राष्ट्रीय आंदोलन', available: false },
      { id: 'ancient-india', label: 'Ancient India', labelHi: 'प्राचीन भारत', available: false },
      { id: 'medieval-india', label: 'Medieval India', labelHi: 'मध्यकालीन भारत', available: false },
    ],
  },
  {
    id: 'geography',
    label: 'Geography',
    labelHi: 'भूगोल',
    color: 'from-emerald-500 to-teal-500',
    dbCategory: 'Geography',
    topics: [
      { id: 'indian-rivers', label: 'Indian Rivers', labelHi: 'भारतीय नदियाँ', available: false },
      { id: 'climate', label: 'Climate', labelHi: 'जलवायु', available: false },
      { id: 'soil', label: 'Soil', labelHi: 'मिट्टी', available: false },
      { id: 'environment', label: 'Environment', labelHi: 'पर्यावरण', available: false },
    ],
  },
  {
    id: 'science',
    label: 'Science',
    labelHi: 'विज्ञान',
    color: 'from-blue-500 to-indigo-500',
    dbCategory: 'General Science',
    topics: [
      { id: 'physics', label: 'Physics', labelHi: 'भौतिकी', available: false },
      { id: 'chemistry', label: 'Chemistry', labelHi: 'रसायन विज्ञान', available: false },
      { id: 'biology', label: 'Biology', labelHi: 'जीव विज्ञान', available: false },
    ],
  },
  {
    id: 'general-awareness',
    label: 'General Awareness',
    labelHi: 'सामान्य जागरूकता',
    color: 'from-purple-500 to-violet-500',
    dbCategory: 'General Awareness',
    topics: [
      { id: 'current-affairs', label: 'Current Affairs', labelHi: 'समसामयिक घटनाएँ', available: false },
      { id: 'constitution', label: 'Indian Constitution', labelHi: 'भारतीय संविधान', available: false },
    ],
  },
  {
    id: 'mathematics',
    label: 'Mathematics',
    labelHi: 'गणित',
    color: 'from-red-500 to-rose-500',
    dbCategory: 'Mathematics',
    topics: [
      { id: 'arithmetic', label: 'Arithmetic', labelHi: 'अंकगणित', available: false },
      { id: 'algebra', label: 'Algebra', labelHi: 'बीजगणित', available: false },
    ],
  },
  {
    id: 'mental-ability',
    label: 'Mental Ability',
    labelHi: 'मानसिक क्षमता',
    color: 'from-cyan-500 to-sky-500',
    dbCategory: 'Mental Ability',
    topics: [
      { id: 'reasoning', label: 'Reasoning', labelHi: 'तर्कशक्ति', available: false },
    ],
  },
  {
    id: 'social-science',
    label: 'Social Science',
    labelHi: 'सामाजिक विज्ञान',
    color: 'from-pink-500 to-fuchsia-500',
    dbCategory: 'Social Science',
    topics: [
      { id: 'civics', label: 'Civics', labelHi: 'नागरिक शास्त्र', available: false },
      { id: 'economics', label: 'Economics', labelHi: 'अर्थशास्त्र', available: false },
    ],
  },
];
