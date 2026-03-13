import { useState, useEffect } from 'react';
import { allotmentAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download, Loader2, Play, RefreshCw, RotateCcw, BookCheck, Printer } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const BTECH_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const MCA_YEARS = ['1st Year', '2nd Year', '3rd Year'];
const COURSES = ['BTech', 'MCA'];
const SEMESTER_TYPES = ['Even', 'Odd'];

export default function AllotmentSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  // Allotment run form
  const [course, setCourse] = useState('BTech');
  const [year, setYear] = useState('1st Year');
  const [semesterType, setSemesterType] = useState('Even');
  const [semesterYear, setSemesterYear] = useState(new Date().getFullYear());

  // Token reset
  const [resettingTokens, setResettingTokens] = useState(false);
  // Book returns
  const [returnRegNo, setReturnRegNo] = useState('');
  const [returnData, setReturnData] = useState<any>(null);
  const [loadingReturn, setLoadingReturn] = useState(false);
  const [markingReturned, setMarkingReturned] = useState<string | null>(null);

  // Allotment slip
  const [slipRegNo, setSlipRegNo] = useState('');
  const [slipData, setSlipData] = useState<any>(null);
  const [loadingSlip, setLoadingSlip] = useState(false);

  const yearOptions = course === 'MCA' ? MCA_YEARS : BTECH_YEARS;

  useEffect(() => {
    // Reset year if it's not valid for selected course
    if (!yearOptions.includes(year)) {
      setYear(yearOptions[0]);
    }
  }, [course]);

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
        `Run allotment for ${course} - ${year} (${semesterType} ${semesterYear})?\n\nThis will assign books to eligible students based on CPI ranking.`
      )
    )
      return;

    setLoading(true);
    try {
      const data = await allotmentAPI.runAllotment({ course, year, semesterType, semesterYear });
      setResults(data);
      setSelectedEventId(data.eventId);
      await loadEvents();

      toast({
        title: 'Allotment Complete',
        description: `${data.totalAllocations} books allotted for ${course} - ${year}.`,
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
      toast({ title: 'Error', description: error.message || 'Failed to download report', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadNonReturned = async () => {
    setDownloading(true);
    try {
      await allotmentAPI.downloadNonReturnedReport();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to download', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleResetTokens = async () => {
    if (!confirm(`Reset token counters for ${semesterType} ${semesterYear}? This will restart serial numbers from 01.`)) return;
    setResettingTokens(true);
    try {
      await allotmentAPI.resetTokens(semesterType, semesterYear);
      toast({ title: 'Done', description: `Token counters reset for ${semesterType} ${semesterYear}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to reset tokens', variant: 'destructive' });
    } finally {
      setResettingTokens(false);
    }
  };

  // Book returns
  const handleLookupReturn = async () => {
    if (!returnRegNo.trim()) return;
    setLoadingReturn(true);
    setReturnData(null);
    try {
      const data = await allotmentAPI.getReturns(returnRegNo.trim());
      setReturnData(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Student not found', variant: 'destructive' });
    } finally {
      setLoadingReturn(false);
    }
  };

  const handleMarkReturned = async (allotmentId: string) => {
    setMarkingReturned(allotmentId);
    try {
      await allotmentAPI.markReturned(allotmentId);
      setReturnData((prev: any) => ({
        ...prev,
        allotments: prev.allotments.map((a: any) =>
          a._id === allotmentId ? { ...a, returned: true, returnedAt: new Date().toISOString() } : a
        ),
      }));
      toast({ title: 'Returned', description: 'Book marked as returned and copies updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to mark returned', variant: 'destructive' });
    } finally {
      setMarkingReturned(null);
    }
  };

  // Allotment slip
  const handleLookupSlip = async () => {
    if (!slipRegNo.trim()) return;
    setLoadingSlip(true);
    setSlipData(null);
    try {
      const data = await allotmentAPI.getSlip(slipRegNo.trim());
      setSlipData(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Student not found', variant: 'destructive' });
    } finally {
      setLoadingSlip(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">

      {/* Run Allotment */}
      <Card>
        <CardHeader>
          <CardTitle>Run Allotment Event</CardTitle>
          <CardDescription>
            Select course and year, then run allotment. Students are ranked by CPI (highest first); ties broken by submission time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Course</Label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full border rounded px-2 py-2 text-sm bg-background"
              >
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full border rounded px-2 py-2 text-sm bg-background"
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Semester</Label>
              <select
                value={semesterType}
                onChange={(e) => setSemesterType(e.target.value)}
                className="w-full border rounded px-2 py-2 text-sm bg-background"
              >
                {SEMESTER_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Year (AD)</Label>
              <Input
                type="number"
                value={semesterYear}
                onChange={(e) => setSemesterYear(Number(e.target.value))}
                min={2020}
                max={2099}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRunAllotment} disabled={loading} size="lg">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</>
              ) : (
                <><Play className="mr-2 h-4 w-4" />Run Allotment</>
              )}
            </Button>
            <Button variant="outline" onClick={handleResetTokens} disabled={resettingTokens}>
              {resettingTokens ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Reset Token Counters
            </Button>
<Button variant="outline" onClick={handleDownloadNonReturned} disabled={downloading}>
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export Non-Returned Books
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Previous Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Allotment Events</CardTitle>
            <CardDescription>Click on an event to view results</CardDescription>
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
                    {event.course} – {event.year} &nbsp;|&nbsp; {event.semesterType} {event.semesterYear}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {new Date(event.runAt).toLocaleString()} &nbsp;·&nbsp; by {event.runByAdminId?.name || 'Admin'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="w-full sm:w-auto">
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
                  {results.totalAllocations} allotted &nbsp;·&nbsp; sorted by branch then year
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleDownloadReport} disabled={downloading} className="w-full sm:w-auto">
                  {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download Excel
                </Button>
                <Button variant="outline" onClick={() => setResults(null)} className="w-full sm:w-auto">
                  <RefreshCw className="mr-2 h-4 w-4" />Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token No.</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Reg. No.</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Class No.</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.results.map((result: any) => (
                      <TableRow key={result._id}>
                        <TableCell className="font-mono text-xs">{result.tokenNumber || '-'}</TableCell>
                        <TableCell>{result.userId?.name}</TableCell>
                        <TableCell>{result.userId?.registrationNumber}</TableCell>
                        <TableCell>{result.userId?.branch || '-'}</TableCell>
                        <TableCell>{result.bookId?.title}</TableCell>
                        <TableCell>{result.bookId?.classNo || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={result.status === 'allotted' ? 'default' : 'secondary'}>
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

      {/* Book Returns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookCheck className="h-5 w-5" /> Book Returns</CardTitle>
          <CardDescription>Enter a student's registration number to view and mark books as returned</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Registration Number (e.g. 21114XXX)"
              value={returnRegNo}
              onChange={(e) => setReturnRegNo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookupReturn()}
              className="max-w-xs"
            />
            <Button onClick={handleLookupReturn} disabled={loadingReturn}>
              {loadingReturn ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
            </Button>
          </div>
          {returnData && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <strong>{returnData.student.name}</strong> &nbsp;·&nbsp; {returnData.student.registrationNumber} &nbsp;·&nbsp; {returnData.student.branch} &nbsp;·&nbsp; {returnData.student.batch} &nbsp;·&nbsp; {returnData.student.course}
              </div>
              {returnData.allotments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No allotted books found for this student.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 pr-2">Token</th>
                      <th className="text-left py-1 pr-2">Book Title</th>
                      <th className="text-left py-1 pr-2">Class No.</th>
                      <th className="text-left py-1 pr-2">Status</th>
                      <th className="text-right py-1">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnData.allotments.map((a: any) => (
                      <tr key={a._id} className={`border-t ${a.returned ? 'opacity-60' : ''}`}>
                        <td className="py-2 pr-2 font-mono text-xs">{a.tokenNumber || '-'}</td>
                        <td className="py-2 pr-2">{a.book?.title || '-'}</td>
                        <td className="py-2 pr-2 text-muted-foreground">{a.book?.classNo || '-'}</td>
                        <td className="py-2 pr-2">
                          {a.returned ? (
                            <span className="text-green-600 font-medium">✓ Returned</span>
                          ) : (
                            <span className="text-yellow-600">Pending</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {!a.returned && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkReturned(a._id)}
                              disabled={markingReturned === a._id}
                            >
                              {markingReturned === a._id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Returned'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allotment Slip */}
      <Card className="print:shadow-none">
        <CardHeader className="print:hidden">
          <CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5" /> Generate Allotment Slip</CardTitle>
          <CardDescription>Enter a student's registration number to generate a printable slip</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 print:hidden">
            <Input
              placeholder="Registration Number"
              value={slipRegNo}
              onChange={(e) => setSlipRegNo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookupSlip()}
              className="max-w-xs"
            />
            <Button onClick={handleLookupSlip} disabled={loadingSlip}>
              {loadingSlip ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
            </Button>
            {slipData && (
              <Button variant="outline" onClick={handlePrintSlip}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            )}
          </div>
          {slipData && (
            <div className="border rounded-lg p-6 space-y-4 print:border-none print:p-0">
              <div className="text-center print:block hidden">
                <h2 className="text-xl font-bold">MNNIT Allahabad — Central Library</h2>
                <h3 className="text-lg font-semibold mt-1">Book Allotment Slip</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <strong>{slipData.student.name}</strong></div>
                <div><span className="text-muted-foreground">Reg. No.:</span> <strong>{slipData.student.registrationNumber}</strong></div>
                <div><span className="text-muted-foreground">Branch:</span> {slipData.student.branch || '-'}</div>
                <div><span className="text-muted-foreground">Course/Year:</span> {slipData.student.course} – {slipData.student.batch}</div>
              </div>
              {slipData.allotments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No books allotted to this student.</p>
              ) : (
                slipData.allotments.map((a: any) => (
                  <div key={a._id} className="border rounded p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-lg">{a.tokenNumber || 'N/A'}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.semesterType} {a.semesterYear} &nbsp;·&nbsp; {new Date(a.allotmentDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm font-medium">{a.book?.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Author: {a.book?.author || '-'} &nbsp;·&nbsp; Class No.: {a.book?.classNo || '-'}
                    </div>
                    {a.returned && <div className="text-xs text-green-600">✓ Returned</div>}
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground print:block hidden">
                Please present this slip at the library counter to collect your books.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
