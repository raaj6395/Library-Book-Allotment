import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { booksAPI, adminBooksAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash } from 'lucide-react';

interface BookFormData {
  title: string;
  author: string;
  isbnOrBookId: string;
  category: string;
  totalCopies: number;
  description: string;
}

export default function AddBookForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [books, setBooks] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BookFormData>({
    defaultValues: {
      totalCopies: 1,
      category: '',
      description: '',
    },
  });

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await adminBooksAPI.list({ search: debouncedSearch, page: 1, limit: 100 });
      // handle both shapes: { items: [...] } or [...] (backwards compatibility)
      const items = Array.isArray(res) ? res : (res.items || []);
      setBooks(items);
    } catch (err: any) {
      setListError(err?.response?.data?.message || err?.message || 'Failed to load books');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [debouncedSearch]);

  const onSubmit = async (data: BookFormData) => {
    setLoading(true);
    try {
      await booksAPI.create(data);
      toast({
        title: 'Success',
        description: 'Book added successfully!',
      });
      reset();
      fetchList();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add book',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'Validation', description: 'Title is required', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const created = await adminBooksAPI.create({ title: title.trim(), author: author.trim() || undefined });
      setTitle('');
      setAuthor('');
      // optimistic update: add created book to UI
      setBooks((s) => [created, ...s]);
      toast({ title: 'Added', description: 'Book added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to add book', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book? This will hide it from students.')) return;
    setDeleting(id);
    try {
      await adminBooksAPI.remove(id);
      setBooks((s) => s.filter((b) => b._id !== id));
      toast({ title: 'Deleted', description: 'Book deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Book</CardTitle>
          <CardDescription>Enter book details to add it to the library</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'Title is required' })}
                  placeholder="Introduction to Algorithms"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  {...register('author', { required: 'Author is required' })}
                  placeholder="Thomas H. Cormen"
                />
                {errors.author && (
                  <p className="text-sm text-destructive">{errors.author.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbnOrBookId">ISBN / Book ID *</Label>
                <Input
                  id="isbnOrBookId"
                  {...register('isbnOrBookId', { required: 'ISBN/Book ID is required' })}
                  placeholder="B001"
                />
                {errors.isbnOrBookId && (
                  <p className="text-sm text-destructive">{errors.isbnOrBookId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category / Subject</Label>
                <Input
                  id="category"
                  {...register('category')}
                  placeholder="Computer Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalCopies">Total Copies *</Label>
                <Input
                  id="totalCopies"
                  type="number"
                  min="1"
                  {...register('totalCopies', {
                    required: 'Total copies is required',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Must be at least 1' },
                  })}
                />
                {errors.totalCopies && (
                  <p className="text-sm text-destructive">{errors.totalCopies.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Book description (optional)"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Book
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-medium">All Books</h3>
          <Input placeholder="Search by title or author" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {listLoading ? (
          <div className="p-4">Loading...</div>
        ) : listError ? (
          <div className="p-4 text-destructive">{listError}</div>
        ) : books.length === 0 ? (
          <div className="p-4 text-muted-foreground">No books found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Title</th>
                <th className="text-left">Author</th>
                <th className="text-left">Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b._id} className="border-t">
                  <td>{b.title}</td>
                  <td>{b.author || '-'}</td>
                  <td>{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="text-right">
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(b._id)} disabled={deleting === b._id}>
                      {deleting === b._id ? 'Deleting...' : <><Trash className="mr-2 h-4 w-4" />Delete</>}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

