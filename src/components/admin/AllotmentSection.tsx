import { useState, useEffect } from 'react';
import { allotmentAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Play, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AllotmentSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await allotmentAPI.getEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleRunAllotment = async () => {
    if (!confirm('Are you sure you want to run the allotment? This will assign books based on user preferences.')) {
      return;
    }

    setLoading(true);
    try {
      const data = await allotmentAPI.runAllotment();
      setResults(data);
      await loadEvents();
      toast({
        title: 'Success',
        description: `Allotment completed! ${data.totalAllocations} books allotted, ${data.totalWaitlists} waitlisted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run allotment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (eventId: string) => {
    try {
      const data = await allotmentAPI.getResults(eventId);
      setResults({ results: data });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load results',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run Allotment Event</CardTitle>
          <CardDescription>
            Assign books to users based on their submitted preferences (first-come-first-serve)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRunAllotment} disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Allotment...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Allotment
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Allotment Events</CardTitle>
            <CardDescription>Click on an event to view results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => loadResults(event._id)}
                >
                  <div>
                    <p className="font-medium">
                      Event on {new Date(event.runAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Run by {event.runByAdminId?.name || 'Admin'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Results
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results && results.results && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Allotment Results</CardTitle>
                <CardDescription>
                  {results.totalAllocations} allotted, {results.totalWaitlists} waitlisted
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setResults(null)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.results.map((result: any) => (
                    <TableRow key={result._id}>
                      <TableCell>{result.userId?.name}</TableCell>
                      <TableCell>{result.userId?.registrationNumber}</TableCell>
                      <TableCell>{result.bookId?.title}</TableCell>
                      <TableCell>{result.bookId?.author}</TableCell>
                      <TableCell>
                        <Badge
                          variant={result.status === 'allotted' ? 'default' : 'secondary'}
                        >
                          {result.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

