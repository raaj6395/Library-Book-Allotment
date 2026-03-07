import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { booksAPI, preferencesAPI, allotmentAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Book {
  _id: string;
  title: string;
  author: string;
  isbnOrBookId: string;
  category: string;
  availableCopies: number;
}

export default function UserBookSelection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [myPreferences, setMyPreferences] = useState<any>(null);
  const [myAllocation, setMyAllocation] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  //for search bar
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBooks = books.filter((book) => {
    const query = searchTerm.toLowerCase();

    return (
      book.title?.toLowerCase().includes(query) ||
      book.author?.toLowerCase().includes(query) ||
      book.category?.toLowerCase().includes(query) ||
      book.isbnOrBookId?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [booksData, preferencesData, allocationData] = await Promise.all([
        booksAPI.getAll(),
        preferencesAPI.getMyPreferences().catch(() => null),
        allotmentAPI.getMyAllocation().catch(() => null),
      ]);
      setBooks(booksData);
      setMyPreferences(preferencesData);
      setMyAllocation(allocationData);
      if (preferencesData?.rankedBookIds) {
        setSelectedBooks(preferencesData.rankedBookIds.map((b: any) => b._id || b));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load books',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleBookSelection = (bookId: string) => {
    if (selectedBooks.includes(bookId)) {
      setSelectedBooks(selectedBooks.filter(id => id !== bookId));
    } else {
      if (selectedBooks.length >= 10) {
        toast({
          title: 'Limit Reached',
          description: 'You can select a maximum of 10 books',
          variant: 'destructive',
        });
        return;
      }
      setSelectedBooks([...selectedBooks, bookId]);
    }
  };

  //----for interactive ui alert
  const confirmSubmitPreferences = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      await preferencesAPI.submitPreferences(selectedBooks);

      toast({
        title: "Success",
        description: "Your book preferences have been submitted!",
      });

      await loadData();
    } catch (error: any) {
      if (error.message?.includes("Preferences already submitted")) { //for extra safety
        toast({
          title: "Preferences Already Submitted",
          description: "Your preference has already been filled and cannot be updated.",
          variant: "destructive",
        });
        // Reset selections back to saved preferences
        if (myPreferences?.rankedBookIds) {
          setSelectedBooks(
            myPreferences.rankedBookIds.map((b: any) => b._id || b)
          );
        }
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit preferences",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPreferences = async () => {
    if (selectedBooks.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one book',
        variant: 'destructive',
      });
      return;
    }

    //----------for a basic alert window-------
    // const confirmSubmit = window.confirm(
    //   "Your preferences have been saved and cannot be changed. Please ensure your selections are correct before submitting."
    // );

    // if (!confirmSubmit) return;

    setShowConfirmDialog(true);

    // setSubmitting(true);
    // try {
    //   await preferencesAPI.submitPreferences(selectedBooks);
    //   toast({
    //     title: 'Success',
    //     description: 'Your book preferences have been submitted!',
    //   });
    //   await loadData();
    // } catch (error: any) {
    //   toast({
    //     title: 'Error',
    //     description: error.message || 'Failed to submit preferences',
    //     variant: 'destructive',
    //   });
    // } finally {
    //   setSubmitting(false);
    // }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Select Books</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {myAllocation?.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Your Book Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2">
                {myAllocation.map((a: any) => (
                  <li key={a._id}>
                    <span className="font-semibold">{a.bookId?.title}</span>
                    <span className="text-muted-foreground"> by {a.bookId?.author}</span>
                    <Badge variant="default" className="ml-2">{a.status}</Badge>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {myPreferences && !(myAllocation?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Your Submitted Preferences</CardTitle>
              <CardDescription>
                Submitted on {new Date(myPreferences.submittedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2">
                {myPreferences.rankedBookIds.map((book: any, index: number) => (
                  <li key={book._id || book}>
                    <span className="font-medium">{book.title || 'Loading...'}</span> by {book.author || 'N/A'}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Available Books</CardTitle>
            <CardDescription>
              Select up to 10 books in order of preference (drag to reorder)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="text"
              placeholder="Search by title, author, category or book ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded-md mb-2"
            />
            <div className="space-y-4">
              {myPreferences && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-md p-3 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Preferences already submitted. You cannot modify them.
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>ISBN/ID</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBooks.map((book) => {
                      const isSelected = selectedBooks.includes(book._id);
                      const priority = isSelected ? selectedBooks.indexOf(book._id) + 1 : null;
                      return (
                        <TableRow
                          key={book._id}
                          className={isSelected ? 'bg-muted' : ''}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!!myPreferences}
                              onChange={() => toggleBookSelection(book._id)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{book.title}</TableCell>
                          <TableCell>{book.author}</TableCell>
                          <TableCell>{book.isbnOrBookId}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{book.category || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>{book.availableCopies}</TableCell>
                          <TableCell>
                            {priority && (
                              <Badge variant="default">#{priority}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {selectedBooks.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="font-semibold mb-2">Your Selection ({selectedBooks.length}/10):</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {selectedBooks.map((bookId, index) => {
                      const book = books.find(b => b._id === bookId);
                      return (
                        <li key={bookId}>
                          {book ? `${book.title} by ${book.author}` : 'Loading...'}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              <Button
                onClick={handleSubmitPreferences}
                disabled={submitting || selectedBooks.length === 0}
                size="lg"
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Submit Preferences
                  </>
                )}
              </Button>
              <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      ⚠ Confirm Submission
                    </DialogTitle>
                    <DialogDescription>
                      Please review your selections before submitting.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Warning box */}
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
                    <p className="font-semibold mb-1">Important Notice</p>
                    <p>
                      Your preferences will be permanently saved and <strong>cannot be changed later</strong>.
                      Please ensure your selections are correct before proceeding.
                    </p>
                  </div>

                  <DialogFooter className="gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirmDialog(false)}
                    >
                      Cancel
                    </Button>

                    <Button
                      onClick={confirmSubmitPreferences}
                      disabled={submitting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      I Understand & Submit
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

