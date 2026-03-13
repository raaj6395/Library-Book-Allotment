import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { booksAPI, adminBooksAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash, Edit2, Check, X } from 'lucide-react';

interface BookFormData {
  title: string;
  author: string;
  isbnOrBookId: string;
  category: string;
  classNo: string;
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
  const [editingCopies, setEditingCopies] = useState<string | null>(null);
  const [editCopiesValue, setEditCopiesValue] = useState<number>(0);
  const [savingCopies, setSavingCopies] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const limit = 15;
  const [total, setTotal] = useState(1);
  const totalPages = Math.ceil(total / limit);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BookFormData>({
    defaultValues: {
      totalCopies: 1,
      category: '',
      classNo: '',
      description: '',
    },
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await adminBooksAPI.list({
        search: debouncedSearch,
        page: currentPage,
        limit
      });

      const items = res.items || [];
      setBooks(items);
      setTotal(res.total || 1);
      const newTotalPages = Math.ceil((res.total || 1) / limit);
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    } catch (err: any) {
      setListError(err?.message || 'Failed to load books');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [debouncedSearch, currentPage]);

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
      setBooks((s) => [created, ...s]);
      toast({ title: 'Added', description: 'Book added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to add book', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const startEditCopies = (b: any) => {
    setEditingCopies(b._id);
    setEditCopiesValue(b.totalCopies);
  };

  const cancelEditCopies = () => {
    setEditingCopies(null);
  };

  const saveEditCopies = async (id: string) => {
    setSavingCopies(true);
    try {
      const updated = await booksAPI.update(id, { totalCopies: editCopiesValue });
      setBooks((s) => s.map((b) => b._id === id ? { ...b, totalCopies: updated.totalCopies, availableCopies: updated.availableCopies } : b));
      toast({ title: 'Updated', description: 'Available copies updated' });
      setEditingCopies(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to update copies', variant: 'destructive' });
    } finally {
      setSavingCopies(false);
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
      toast({ title: 'Error', description: err?.message || 'Failed to delete', variant: 'destructive' });
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
                <Label htmlFor="classNo">Class No. (Shelf No.)</Label>
                <Input
                  id="classNo"
                  {...register('classNo')}
                  placeholder="005.133"
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
          <Input placeholder="Search by title or author" value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }} className="w-64" />
        </div>

        <div className="relative">
          {listError && (
            <div className="p-4 text-destructive">{listError}</div>
          )}
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-2 min-w-[180px]">Title</th>
                <th className="text-left py-2 pr-2 min-w-[120px]">Author</th>
                <th className="text-left py-2 pr-2 w-[90px]">Class No.</th>
                <th className="text-left py-2 pr-2 w-[80px]">Copies</th>
                <th className="text-right py-2 w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listLoading && books.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    No books found.
                  </td>
                </tr>
              ) : (
                books.map((b) => (
                  <tr key={b._id} className="border-t">
                    <td className="py-2 pr-2 truncate max-w-[200px]" title={b.title}>
                      {b.title}
                    </td>
                    <td className="py-2 pr-2">{b.author || '-'}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{b.classNo || '-'}</td>
                    <td className="py-2 pr-2">
                      {editingCopies === b._id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={editCopiesValue}
                            onChange={(e) => setEditCopiesValue(Number(e.target.value))}
                            className="h-7 w-16 text-xs px-1"
                          />
                          <button onClick={() => saveEditCopies(b._id)} disabled={savingCopies} className="text-green-600 hover:text-green-800">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={cancelEditCopies} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline flex items-center gap-1"
                          onClick={() => startEditCopies(b)}
                          title="Click to update available copies"
                        >
                          {b.availableCopies}/{b.totalCopies}
                          <Edit2 className="h-3 w-3 text-muted-foreground" />
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="px-2 flex items-center gap-1 ml-auto"
                        onClick={() => handleDelete(b._id)}
                        disabled={deleting === b._id}
                      >
                        {deleting === b._id ? (
                          'Deleting...'
                        ) : (
                          <>
                            <Trash className="h-4 w-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>

            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
          {listLoading && books.length > 0 && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Updating...</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
