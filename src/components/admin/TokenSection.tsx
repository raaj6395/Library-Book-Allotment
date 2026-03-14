import { useState } from 'react';
import { tokenAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download, Loader2, Search, PackageCheck, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TokenSection() {
  const { toast } = useToast();

  // Token lookup
  const [tokenNumber, setTokenNumber] = useState('');
  const [tokenData, setTokenData] = useState<any>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);

  // Actions
  const [actionLoading, setActionLoading] = useState(false);

  // Unreturned
  const [unreturned, setUnreturned] = useState<any[]>([]);
  const [loadingUnreturned, setLoadingUnreturned] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('');

  const handleLookup = async () => {
    const num = tokenNumber.trim();
    if (!num) return;
    setLoadingLookup(true);
    setTokenData(null);
    try {
      const data = await tokenAPI.lookup(num);
      setTokenData(data);
    } catch (error: any) {
      toast({ title: 'Not Found', description: error.message || 'Token not found', variant: 'destructive' });
    } finally {
      setLoadingLookup(false);
    }
  };

  const handlePickup = async () => {
    if (!tokenData) return;
    setActionLoading(true);
    try {
      const result = await tokenAPI.markPickedUp(tokenData.tokenNumber);
      setTokenData(result.token);
      toast({ title: 'Success', description: 'Books marked as picked up' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!tokenData) return;
    if (!confirm('Mark all books as returned and restock inventory?')) return;
    setActionLoading(true);
    try {
      const result = await tokenAPI.markReturned(tokenData.tokenNumber);
      setTokenData(result.token);
      toast({ title: 'Success', description: 'Books returned and restocked' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLoadUnreturned = async () => {
    setLoadingUnreturned(true);
    try {
      const data = await tokenAPI.getUnreturned(sessionFilter || undefined);
      setUnreturned(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed', variant: 'destructive' });
    } finally {
      setLoadingUnreturned(false);
    }
  };

  const handleDownloadUnreturned = async () => {
    setDownloadingReport(true);
    try {
      await tokenAPI.downloadUnreturned(sessionFilter || undefined);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to download', variant: 'destructive' });
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Token Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Token Lookup
          </CardTitle>
          <CardDescription>
            Enter a token number to view details, mark pickup, or process return
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Token Number (e.g. E/2026/01)"
              value={tokenNumber}
              onChange={(e) => setTokenNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="max-w-sm"
            />
            <Button onClick={handleLookup} disabled={loadingLookup}>
              {loadingLookup ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
            </Button>
          </div>

          {tokenData && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xl">{tokenData.tokenNumber}</span>
                <div className="flex gap-2">
                  {tokenData.isPickedUp ? (
                    <Badge variant="default">Picked Up</Badge>
                  ) : (
                    <Badge variant="secondary">Not Picked Up</Badge>
                  )}
                  {tokenData.isReturned ? (
                    <Badge className="bg-green-100 text-green-800">Returned</Badge>
                  ) : (
                    <Badge variant="outline">Not Returned</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <strong>{tokenData.studentName}</strong></div>
                <div><span className="text-muted-foreground">Reg No:</span> <strong>{tokenData.regNo}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> {tokenData.email}</div>
                <div><span className="text-muted-foreground">Course:</span> {tokenData.course}</div>
                <div><span className="text-muted-foreground">Branch:</span> {tokenData.branch || '-'}</div>
                <div><span className="text-muted-foreground">Session:</span> {tokenData.session}</div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Allotted Books</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {tokenData.allottedBooks?.map((b: any, i: number) => (
                    <li key={i}>{b.bookName}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                {!tokenData.isPickedUp && (
                  <Button onClick={handlePickup} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                    Mark Picked Up
                  </Button>
                )}
                {tokenData.isPickedUp && !tokenData.isReturned && (
                  <Button variant="outline" onClick={handleReturn} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
                    Process Return
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unreturned Books Report */}
      <Card>
        <CardHeader>
          <CardTitle>Unreturned Books Report</CardTitle>
          <CardDescription>
            View and download a list of students who picked up books but haven't returned them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Session ID (optional filter)</label>
              <Input
                placeholder="Session ID"
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Button onClick={handleLoadUnreturned} disabled={loadingUnreturned}>
              {loadingUnreturned ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Load Report
            </Button>
            <Button variant="outline" onClick={handleDownloadUnreturned} disabled={downloadingReport}>
              {downloadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download Excel
            </Button>
          </div>

          {unreturned.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Token</th>
                    <th className="pb-2 pr-3 font-medium">Name</th>
                    <th className="pb-2 pr-3 font-medium">Reg No</th>
                    <th className="pb-2 pr-3 font-medium">Course</th>
                    <th className="pb-2 pr-3 font-medium">Session</th>
                    <th className="pb-2 font-medium">Books</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {unreturned.map((t: any) => (
                    <tr key={t._id} className="hover:bg-muted/50">
                      <td className="py-2 pr-3 font-mono text-xs">{t.tokenNumber}</td>
                      <td className="py-2 pr-3">{t.studentName}</td>
                      <td className="py-2 pr-3">{t.regNo}</td>
                      <td className="py-2 pr-3">{t.course}</td>
                      <td className="py-2 pr-3">{t.session}</td>
                      <td className="py-2 text-xs">
                        {t.allottedBooks?.map((b: any) => b.bookName).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">{unreturned.length} record(s)</p>
            </div>
          )}

          {unreturned.length === 0 && !loadingUnreturned && (
            <p className="text-sm text-muted-foreground">No unreturned books found. Click "Load Report" to search.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
