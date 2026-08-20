import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GAUSI Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Security warning banner */}
      <div className="bg-red-600 text-white text-xs font-semibold text-center py-1.5 px-4">
        ⚠ ADMIN AREA — Not publicly accessible. No authentication is implemented yet. Do not share this URL.
      </div>

      {/* Admin header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm">
              G
            </div>
            <div>
              <span className="font-bold text-white text-base">GAUSI Admin</span>
              <span className="text-slate-400 text-xs ml-2">Daily Test Automation</span>
            </div>
          </div>
          <a href="/" className="text-slate-400 hover:text-white text-xs transition-colors">
            ← Public Site
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
