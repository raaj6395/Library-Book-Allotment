import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
// ...UI components...

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
      // fetch available books (exclude deleted)
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
    if (selected.length >= max) return; // enforce
    setSelected([...selected, id]);
  };

  const submit = async () => {
    setLoading(true);
    try {
      await axios.post('/api/preferences', { bookIds: selected });
      setStatus((s: any) => ({ ...s, preferences: { ...s.preferences, hasSubmitted: true, bookIds: selected, submittedAt: new Date() } }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (!status) return <div>Loading...</div>;

  if (status.preferences?.hasSubmitted && !status.allotment?.isAllotted) {
    return (
      <div>
        <h3>Your submitted priorities</h3>
        <ol>{status.preferences.bookIds.map((id: string) => {
          const b = status.preferences.books.find((x: any) => x._id === id) || { title: id };
          return <li key={id}>{b.title}</li>;
        })}</ol>
        <p>Waiting for allotment.</p>
      </div>
    );
  }

  if (status.allotment?.isAllotted) {
    return (
      <div>
        <h3>Your allotted books</h3>
        <ul>{status.allotment.books.map((b: any) => <li key={b._id}>{b.title} - {b.author}</li>)}</ul>
      </div>
    );
  }

  // selection UI
  return (
    <div>
      <p>You can select up to {max} books. Selected: {selected.length}</p>
      <ul>
        {available.map(b => (
          <li key={b._id}>
            <label>
              <input type="checkbox" checked={selected.includes(b._id)} onChange={() => toggle(b._id)} disabled={selected.length >= max && !selected.includes(b._id)} />
              {b.title} — {b.author}
            </label>
          </li>
        ))}
      </ul>
      <Button onClick={submit} disabled={loading || selected.length === 0}>Submit Preferences</Button>
    </div>
  );
}
