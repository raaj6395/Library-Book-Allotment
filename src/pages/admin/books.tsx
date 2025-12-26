import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { adminBooksAPI } from '@/lib/api';
import BooksTable from '@/components/admin/BooksTable';
import { useToast } from '@/hooks/use-toast';

export default function AdminBooksPage() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState(search);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminBooksAPI.list({ search: debounced, page: 1, limit: 50 });
      setBooks(res.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [debounced]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'Validation', description: 'Title is required', variant: 'destructive' });
      return;
    }
    try {
      await adminBooksAPI.create({ title: title.trim(), author: author.trim() || undefined });
      setTitle('');
      setAuthor('');
      toast({ title: 'Added', description: 'Book added' });
      fetchList();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to add book', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await adminBooksAPI.remove(id);
      // remove locally to avoid refetch
      setBooks((s) => s.filter((b) => b._id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-2">Add Book</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Author (optional)" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <Button type="submit">Add Book</Button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-medium">All Books</h3>
          <Input placeholder="Search by title or author" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="p-4">Loading...</div>
        ) : error ? (
          <div className="p-4 text-destructive">{error}</div>
        ) : (
          <BooksTable books={books} onDelete={handleDelete} deleting={deleting} />
        )}
      </section>
    </div>
  );
}
