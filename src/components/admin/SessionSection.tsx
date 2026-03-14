import { useEffect, useState } from 'react';
import { sessionAPI } from '@/lib/api';
import { toast } from 'sonner';

type Session = {
  _id: string;
  year: number;
  semesterType: 'ODD' | 'EVEN';
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
  endedAt?: string;
  eventCount?: number;
  userCount?: number;
};

interface SessionSectionProps {
  onSessionChange?: () => void;
}

export function SessionSection({ onSessionChange }: SessionSectionProps) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Form state
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [newSemesterType, setNewSemesterType] = useState<'ODD' | 'EVEN'>('ODD');

  async function load() {
    setLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        sessionAPI.getActive(),
        sessionAPI.getHistory(),
      ]);
      setActiveSession(activeRes.session);
      setHistory(historyRes);
    } catch {
      toast.error('Failed to load session data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!newYear || newYear < 2000) {
      toast.error('Enter a valid year (e.g. 2026)');
      return;
    }
    setCreating(true);
    try {
      await sessionAPI.create({ year: newYear, semesterType: newSemesterType });
      toast.success(`${newSemesterType} ${newYear} session created`);
      await load();
      onSessionChange?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }

  async function handleEnd() {
    setEnding(true);
    try {
      await sessionAPI.end();
      toast.success('Session ended successfully');
      setConfirmEnd(false);
      await load();
      onSessionChange?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to end session');
    } finally {
      setEnding(false);
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Session Card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Session</h2>

        {activeSession ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Active
              </span>
              <span className="text-xl font-bold text-gray-900">
                {activeSession.semesterType} Semester {activeSession.year}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {formatDate(activeSession.createdAt)}
              </div>
              <div>
                <span className="font-medium">Status:</span> ACTIVE
              </div>
            </div>

            {!confirmEnd ? (
              <button
                onClick={() => setConfirmEnd(true)}
                className="mt-2 rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
              >
                End Session
              </button>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm text-red-800 font-medium">
                  Are you sure you want to end this session?
                </p>
                <p className="text-xs text-red-600">
                  All users and allotments remain archived. A new session can be created afterward.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleEnd}
                    disabled={ending}
                    className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {ending ? 'Ending…' : 'Yes, End Session'}
                  </button>
                  <button
                    onClick={() => setConfirmEnd(false)}
                    className="rounded-md border px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-4 py-3">
              No active session. Create a new session below to start the allotment cycle.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester Type
                </label>
                <select
                  value={newSemesterType}
                  onChange={(e) => setNewSemesterType(e.target.value as 'ODD' | 'EVEN')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ODD">ODD</option>
                  <option value="EVEN">EVEN</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  min={2000}
                  max={2100}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create Session'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Session History Table */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Session History</h2>

        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Semester</th>
                  <th className="pb-2 pr-4 font-medium">Year</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Created</th>
                  <th className="pb-2 pr-4 font-medium">Ended</th>
                  <th className="pb-2 pr-4 font-medium">Users</th>
                  <th className="pb-2 font-medium">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{s.semesterType}</td>
                    <td className="py-2 pr-4">{s.year}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{formatDate(s.createdAt)}</td>
                    <td className="py-2 pr-4 text-gray-600">{formatDate(s.endedAt)}</td>
                    <td className="py-2 pr-4 text-gray-600">{s.userCount ?? 0}</td>
                    <td className="py-2 text-gray-600">{s.eventCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
