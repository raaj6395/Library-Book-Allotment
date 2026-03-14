import { useEffect, useState } from 'react';
import { sessionAPI } from '@/lib/api';

type Session = {
  _id: string;
  year: number;
  semesterType: 'ODD' | 'EVEN';
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
};

interface SessionBannerProps {
  refreshKey?: number;
}

export function SessionBanner({ refreshKey }: SessionBannerProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionAPI
      .getActive()
      .then((data) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return null;

  if (session) {
    return (
      <div className="w-full bg-green-50 border-b border-green-200 px-6 py-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-800">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Session Active
        </span>
        <span className="text-sm text-green-700">
          {session.semesterType} Semester {session.year}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full bg-yellow-50 border-b border-yellow-200 px-6 py-2 flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-0.5 text-xs font-semibold text-yellow-800">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        No Active Session
      </span>
      <span className="text-sm text-yellow-700">
        Go to the <strong>Session</strong> tab to create a new semester session before adding users or running allotment.
      </span>
    </div>
  );
}
