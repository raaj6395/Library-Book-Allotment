import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';

export default function PreferencesForm() {
  const [max, setMax] = useState<number>(5);
  const [available, setAvailable] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const cfg = await axios.get('/api/config');
      setMax(cfg.data.maxBookPreferences ?? 5);

      const me = await axios.get('/api/me/library-status');
      setStatus(me.data);

      const books = await axios.get('/api/books');
      setAvailable(books.data.filter((b: any) => !b.isDeleted));

      if (me.data.preferences?.hasSubmitted) {
        setSelected(me.data.preferences.bookIds || []);
      }
    }
    load().catch(console.error);
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
      return;
    }

    if (selected.length >= max) return;

    setSelected([...selected, id]);
  };

  const submit = async () => {
    setLoading(true);

    try {
      await axios.post('/api/preferences', { bookIds: selected });

      setStatus((s: any) => ({
        ...s,
        preferences: {
          ...s.preferences,
          hasSubmitted: true,
          bookIds: selected,
          submittedAt: new Date(),
        },
      }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (status.preferences?.hasSubmitted && !status.allotment?.isAllotted) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h3 className="text-xl font-semibold">Your submitted priorities</h3>

        <ol className="list-decimal ml-6 space-y-1">
          {status.preferences.bookIds.map((id: string) => {
            const b =
              status.preferences.books.find((x: any) => x._id === id) || {
                title: id,
              };

            return <li key={id}>{b.title}</li>;
          })}
        </ol>

        <p className="text-muted-foreground">
          Waiting for allotment.
        </p>
      </div>
    );
  }

  if (status.allotment?.isAllotted) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h3 className="text-xl font-semibold">Your allotted books</h3>

        <ul className="space-y-2">
          {status.allotment.books.map((b: any) => (
            <li
              key={b._id}
              className="border rounded-lg p-3"
            >
              <p className="font-medium">{b.title}</p>
              <p className="text-sm text-muted-foreground">
                {b.author}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <p className="text-sm sm:text-base">
          You can select up to <b>{max}</b> books.
        </p>

        <p className="text-sm text-muted-foreground">
          Selected: {selected.length}
        </p>
      </div>

      {/* Books Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

        {available.map((b) => {

          const checked = selected.includes(b._id);
          const disabled = selected.length >= max && !checked;

          return (
            <label
              key={b._id}
              className={`border rounded-lg p-3 flex gap-3 items-start cursor-pointer transition
              ${checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}
              ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >

              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(b._id)}
                className="mt-1"
              />

              <div>
                <p className="font-medium leading-tight">
                  {b.title}
                </p>

                <p className="text-sm text-muted-foreground">
                  {b.author || 'Unknown Author'}
                </p>
              </div>

            </label>
          );
        })}

      </div>

      <Button
        onClick={submit}
        disabled={loading || selected.length === 0}
        className="w-full sm:w-auto"
      >
        {loading ? 'Submitting...' : 'Submit Preferences'}
      </Button>

    </div>
  );
}