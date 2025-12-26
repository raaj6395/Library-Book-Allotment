import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function BooksTable({
  books,
  onDelete,
  deleting,
}: {
  books: any[];
  onDelete: (id: string) => Promise<void>;
  deleting?: string | null;
}) {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book? This will hide it from students.')) return;
    try {
      await onDelete(id);
      toast({ title: 'Deleted', description: 'Book deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  if (!books.length) {
    return <div className="p-4 text-muted">No books found.</div>;
  }

  return (
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
                {deleting === b._id ? 'Deleting...' : 'Delete'}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
