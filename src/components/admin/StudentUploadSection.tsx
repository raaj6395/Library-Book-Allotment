import { useState } from 'react';
import { studentsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, Trash2 } from 'lucide-react';

const BTECH_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const MCA_YEARS = ['1st Year', '2nd Year', '3rd Year'];
const COURSES = ['BTech', 'MCA'];

export default function StudentUploadSection() {
  const { toast } = useToast();
  const [course, setCourse] = useState('BTech');
  const [year, setYear] = useState('1st Year');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [clearing, setClearing] = useState(false);
  const [clearAll, setClearAll] = useState(false);

  const yearOptions = course === 'MCA' ? MCA_YEARS : BTECH_YEARS;

  const handleUpload = async () => {
    if (!file) {
      toast({ title: 'No file selected', description: 'Please select an Excel (.xlsx) file', variant: 'destructive' });
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await studentsAPI.uploadExcel(file, course, year);
      setUploadResult(result);
      toast({ title: 'Upload Complete', description: result.message });
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message || 'Failed to upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async () => {
    const scopeMsg = clearAll ? 'ALL student records' : `${course} - ${year} students`;
    if (!confirm(`Clear ${scopeMsg}? This cannot be undone.`)) return;
    setClearing(true);
    try {
      const result = await studentsAPI.clear(
        clearAll ? undefined : course,
        clearAll ? undefined : year
      );
      toast({ title: 'Cleared', description: result.message });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to clear', variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Student Data</CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx) with student data for a specific course and year.
            Required columns: <strong>Reg No, Name, Email</strong>. Optional: CPI, Branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Course</Label>
              <select
                value={course}
                onChange={(e) => {
                  setCourse(e.target.value);
                  setYear(e.target.value === 'MCA' ? '1st Year' : '1st Year');
                }}
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
              <Label>Excel File (.xlsx)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" />Upload Students</>
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

      <Card>
        <CardHeader>
          <CardTitle>Clear Student Data</CardTitle>
          <CardDescription>
            Remove existing student records before uploading fresh data for a new semester.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="clearAll"
              checked={clearAll}
              onChange={(e) => setClearAll(e.target.checked)}
            />
            <label htmlFor="clearAll" className="text-sm">Clear ALL student records (all courses/years)</label>
          </div>
          {!clearAll && (
            <div className="grid grid-cols-2 gap-4 max-w-xs">
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
            </div>
          )}
          <Button variant="destructive" onClick={handleClear} disabled={clearing}>
            {clearing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Clearing...</>
            ) : (
              <><Trash2 className="mr-2 h-4 w-4" />{clearAll ? 'Clear All Students' : `Clear ${course} - ${year}`}</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
