import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, X } from 'lucide-react';

interface UserCredentialsPrintProps {
  user: any;
  onClose: () => void;
}

function CredentialGrid({ user }: { user: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Name</p>
          <p className="text-lg">{user.name}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Email / Username</p>
          <p className="text-lg">{user.email}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Registration Number</p>
          <p className="text-lg">{user.registrationNumber}</p>
        </div>
        {user.course && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Course</p>
            <p className="text-lg">{user.course}</p>
          </div>
        )}
        {user.batch && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Batch</p>
            <p className="text-lg">{user.batch}</p>
          </div>
        )}
        {user.branch && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Branch</p>
            <p className="text-lg">{user.branch}</p>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg border-2 border-dashed">
        <p className="text-sm font-semibold text-muted-foreground mb-2">Initial Password</p>
        <p className="text-2xl font-mono font-bold">{user.tempPassword}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Please change this password after first login
        </p>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <p>Login URL: {window.location.origin}/login</p>
        <p>Generated on: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function UserCredentialsPrint({ user, onClose }: UserCredentialsPrintProps) {
  return (
    <>
      <Card className="print:hidden">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">User Credentials</CardTitle>
              <CardDescription>Library Book Allotment System</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.print()} size="sm">
                <Printer className="mr-2 h-4 w-4" />
                Print Credentials
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-6">
          <CredentialGrid user={user} />
        </CardContent>
      </Card>

      {/* Print-only version */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8">
        <div className="border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">User Credentials</h1>
          <p className="text-muted-foreground">Library Book Allotment System</p>
        </div>
        <CredentialGrid user={user} />
      </div>
    </>
  );
}
