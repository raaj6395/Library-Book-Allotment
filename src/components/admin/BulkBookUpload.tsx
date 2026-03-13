import { useState } from 'react';
import { bookUploadAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload } from 'lucide-react';

export default function BulkBookUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) {
      toast({ title: 'No file selected', description: 'Please select an Excel (.xlsx) file', variant: 'destructive' });
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await bookUploadAPI.uploadExcel(file);
      setUploadResult(result);
      toast({ title: 'Upload Complete', description: result.message });
      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message || 'Failed to upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Books</CardTitle>
        <CardDescription>
          Upload an Excel file (.xlsx) to add multiple books at once.
          Expected columns: <strong>Title</strong>, Author, Class No, ISBN/Book ID, Total Copies, Available Copies, Category, Description.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="space-y-1 flex-1 max-w-sm">
            <Label>Excel File (.xlsx)</Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />Upload Books</>
            )}
          </Button>
        </div>
        {uploadResult && (
          <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
            <p className="font-medium">{uploadResult.message}</p>
            {uploadResult.skipReasons?.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">View skipped rows ({uploadResult.skipReasons.length})</summary>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {uploadResult.skipReasons.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
