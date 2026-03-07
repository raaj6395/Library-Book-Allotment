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
      toast({
        title: 'Error',
        description: err?.message || 'Failed to delete',
        variant: 'destructive',
      });
    }
  };

  if (!books.length) {
    return <div className="p-4 text-muted-foreground">No books found.</div>;
  }

  return (
    <div className="w-full overflow-x-auto">

      <table className="w-full min-w-[600px] border-collapse">

        <thead className="bg-muted">
          <tr>

            <th className="text-left p-3 text-sm font-medium">
              Title
            </th>

            <th className="text-left p-3 text-sm font-medium">
              Author
            </th>

            <th className="text-left p-3 text-sm font-medium">
              Created
            </th>

            <th className="text-right p-3 text-sm font-medium">
              Actions
            </th>

          </tr>
        </thead>

        <tbody>

          {books.map((b) => (
            <tr key={b._id} className="border-t hover:bg-muted/40">

              <td className="p-3 text-sm font-medium break-words max-w-[220px]">
                {b.title}
              </td>

              <td className="p-3 text-sm text-muted-foreground">
                {b.author || '-'}
              </td>

              <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                {new Date(b.createdAt).toLocaleString()}
              </td>

              <td className="p-3 text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(b._id)}
                  disabled={deleting === b._id}
                  className="w-full sm:w-auto"
                >
                  {deleting === b._id ? 'Deleting...' : 'Delete'}
                </Button>
              </td>

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}