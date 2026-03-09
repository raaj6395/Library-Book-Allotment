import { useState, useEffect } from 'react';
import { allotmentAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download, Loader2, Play, RefreshCw } from 'lucide-react';
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
  const [downloading, setDownloading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
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
    if (
      !confirm(
        'Are you sure you want to run the allotment? This will assign books based on user preferences.'
      )
    )
      return;

    setLoading(true);
    try {
      const data = await allotmentAPI.runAllotment();
      setResults(data);
      setSelectedEventId(data.eventId);
      await loadEvents();

      toast({
        title: "Allotment Completed",
        description: `✅ ${data.totalAllocations} allotted | ❌ ${data.totalNotAllotted} not allotted`,
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
      setSelectedEventId(eventId);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load results',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedEventId) return;

    setDownloading(true);

    try {
      await allotmentAPI.downloadReport(selectedEventId);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download report',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Run Allotment */}
      <Card>
        <CardHeader>
          <CardTitle>Run Allotment Event</CardTitle>
          <CardDescription>
            Assign books to users based on their submitted preferences
          </CardDescription>
        </CardHeader>

        <CardContent className="flex justify-center sm:justify-start">
          <Button
            onClick={handleRunAllotment}
            disabled={loading}
            size="lg"
            className="w-full sm:w-auto"
          >
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

      {/* Previous Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Allotment Events</CardTitle>
            <CardDescription>
              Click on an event to view results
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">

            {events.map((event) => (
              <div
                key={event._id}
                onClick={() => loadResults(event._id)}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer"
              >
                <div>
                  <p className="font-medium text-sm sm:text-base">
                    Event on {new Date(event.runAt).toLocaleString()}
                  </p>

                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Run by {event.runByAdminId?.name || 'Admin'}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  View Results
                </Button>
              </div>
            ))}

          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && results.results && (
        <Card>
          <CardHeader>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              <div>
                <CardTitle>Allotment Results</CardTitle>
                <CardDescription>
                  {results.totalAllocations} allotted, {results.totalNotAllotted} not allotted
                </CardDescription>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">

                <Button
                  variant="outline"
                  onClick={handleDownloadReport}
                  disabled={downloading}
                  className="w-full sm:w-auto"
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setResults(null)}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Close
                </Button>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            {/* Responsive Table */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[650px]">

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
                            variant={
                              result.status === 'allotted'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {result.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>

                </Table>

              </div>
            </div>

          </CardContent>
        </Card>
      )}

    </div>
  );
}