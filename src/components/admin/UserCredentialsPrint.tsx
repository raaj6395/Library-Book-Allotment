import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Printer, X } from 'lucide-react';

interface UserCredentialsPrintProps {
  user: any;
  onClose: () => void;
}

function CredentialGrid({ user }: { user: any }) {
  return (
    <div className="space-y-4">

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div>
          <p className="text-sm font-semibold text-muted-foreground">Name</p>
          <p className="text-base sm:text-lg break-words">{user.name}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Email / Username
          </p>
          <p className="text-base sm:text-lg break-words">{user.email}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Registration Number
          </p>
          <p className="text-base sm:text-lg">{user.registrationNumber}</p>
        </div>

        {user.course && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              Course
            </p>
            <p className="text-base sm:text-lg">{user.course}</p>
          </div>
        )}

        {user.batch && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              Batch
            </p>
            <p className="text-base sm:text-lg">{user.batch}</p>
          </div>
        )}

        {user.branch && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              Branch
            </p>
            <p className="text-base sm:text-lg">{user.branch}</p>
          </div>
        )}

      </div>

      {/* Password Box */}
      <div className="mt-6 p-5 bg-muted rounded-lg border-2 border-dashed text-center sm:text-left">
        <p className="text-sm font-semibold text-muted-foreground mb-2">
          Initial Password
        </p>

        <p className="text-xl sm:text-2xl font-mono font-bold break-all tracking-widest">
          {user.tempPassword}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs sm:text-sm text-muted-foreground break-words">
        <p>Login URL: {window.location.origin}/login</p>
        <p>Generated on: {new Date().toLocaleString()}</p>
      </div>

    </div>
  );
}

export default function UserCredentialsPrint({
  user,
  onClose,
}: UserCredentialsPrintProps) {
  return (
    <>
      {/* Screen View */}
      <Card className="print:hidden w-full max-w-2xl mx-auto">

        <CardHeader>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">

            <div>
              <CardTitle className="text-xl sm:text-2xl">
                User Credentials
              </CardTitle>

              <CardDescription>
                Library Book Allotment System
              </CardDescription>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">

              <Button
                onClick={() => window.print()}
                size="sm"
                className="w-full sm:w-auto"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Credentials
              </Button>

              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>

            </div>

          </div>

        </CardHeader>

        <CardContent className="mt-2 sm:mt-6">
          <CredentialGrid user={user} />
        </CardContent>

      </Card>

      {/* PRINT AREA */}
      <div className="print-area hidden print:block bg-white p-6">
        <div className="border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold">User Credentials</h1>
          <p className="text-muted-foreground">
            Library Book Allotment System
          </p>
        </div>

        <CredentialGrid user={user} />
      </div>
    </>
  );
}