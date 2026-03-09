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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedBookDetails, setSelectedBookDetails] = useState<any[]>([]);
  const [selectedBookMap, setSelectedBookMap] = useState<Record<string, Book>>({});

  const limit = 15;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [debouncedSearch, currentPage]);

  const loadData = async () => {
    try {
      setTableLoading(true);
      const [booksRes, preferencesData, allocationData] = await Promise.all([
        booksAPI.getAll({
          search: debouncedSearch,
          page: currentPage,
          limit
        }),
        preferencesAPI.getMyPreferences().catch(() => null),
        allotmentAPI.getMyAllocation().catch(() => null),
      ]);

      setBooks(booksRes.items || []);
      setSelectedBookMap(prev => {
        const updated = { ...prev };
        (booksRes.items || []).forEach((b: Book) => {
          updated[b._id] = b;
        });
        return updated;
      });
      setTotal(booksRes.total || 1);

      setMyPreferences(preferencesData);
      setMyAllocation(allocationData);

      if (preferencesData?.rankedBookIds) {
        setSelectedBooks(
          preferencesData.rankedBookIds.map((b: any) => b._id)
        );

        setSelectedBookDetails(preferencesData.rankedBookIds);

        // add books from preferences into map
        setSelectedBookMap(prev => {
          const updated = { ...prev };
          preferencesData.rankedBookIds.forEach((b: any) => {
            if (b?._id) updated[b._id] = b;
          });
          return updated;
        });
      }

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load books',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setTableLoading(false);
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

  const allotted = myAllocation?.filter((a: any) => a.status === "allotted") || [];
  const notAllotted = myAllocation?.filter((a: any) => a.status === "not_allotted") || [];

  return (
    <div className="min-h-screen bg-background">

      <header className="border-b bg-white">
        <div className="container mx-auto px-4 h-24 flex items-center justify-between">

          {/* Left side */}
          <div className="flex items-center gap-3">
            <img
              src="/mnnit-logo.png"
              alt="MNNIT Logo"
              className="h-16 w-auto"
            />

            <div className="leading-tight">
              <h1 className="text-xl font-semibold">
                Central Library - Book Allotment System
              </h1>
              <p className="text-sm text-muted-foreground">
                MNNIT Allahabad
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.name}
            </span>

            <Button size="sm" variant="outline" onClick={handleLogout}>
              <LogOut className="mr-1 h-4 w-4" />
              Logout
            </Button>
          </div>

        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {myAllocation && myAllocation.length > 0 && (
          <Card className={allotted.length > 0
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className={`h-5 w-5 ${allotted.length > 0 ? "text-green-600" : "text-red-600"}`} />
                {allotted.length > 0 ? "Your Book Allocation" : "No Books Allotted"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <ol className="list-decimal list-inside space-y-2">
                {myAllocation.map((a: any) => (
                  <li key={a._id}>
                    <span className="font-semibold">{a.bookId?.title}</span>
                    <span className="text-muted-foreground"> by {a.bookId?.author}</span>

                    <Badge
                      variant={a.status === "allotted" ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {a.status}
                    </Badge>
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 border rounded-md mb-2"
            />
            <div className="space-y-4">
              {myPreferences && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-md p-3 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Preferences already submitted. You cannot modify them.
                </div>
              )}
              <div className="relative rounded-md border">
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
                    {books.map((book) => {
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
                {tableLoading && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
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

              {selectedBooks.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="font-semibold mb-2">Your Selection ({selectedBooks.length}/10):</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {selectedBooks.map((bookId, index) => {
                      const book = selectedBookMap[bookId];
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
      <footer className="border-t mt-10 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Central Library – MNNIT Allahabad
      </footer>
    </div>
  );
}

