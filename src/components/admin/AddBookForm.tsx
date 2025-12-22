import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { booksAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';

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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BookFormData>({
    defaultValues: {
      totalCopies: 1,
      category: '',
      description: '',
    },
  });

  const onSubmit = async (data: BookFormData) => {
    setLoading(true);
    try {
      await booksAPI.create(data);
      toast({
        title: 'Success',
        description: 'Book added successfully!',
      });
      reset();
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

  return (
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
  );
}

