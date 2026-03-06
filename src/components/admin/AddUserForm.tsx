import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usersAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus } from 'lucide-react';
import UserCredentialsPrint from './UserCredentialsPrint';

interface FormData {
  registration_number: string;
}

export default function AddUserForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setInlineError(null);
    try {
      const user = await usersAPI.create({ registration_number: data.registration_number });
      setCreatedUser(user);
      toast({ title: 'Success', description: 'User created successfully!' });
      reset();
    } catch (error: any) {
      const msg: string = error.message || 'Failed to create user';
      if (msg.includes('No student found') || msg.includes('User already exists')) {
        setInlineError(msg);
      } else {
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
          <CardDescription>
            Enter a student's registration number to create their account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number</Label>
              <Input
                id="registration_number"
                {...register('registration_number', { required: 'Registration number is required' })}
                placeholder="e.g. STU2024001"
                className="max-w-sm"
              />
              {errors.registration_number && (
                <p className="text-sm text-destructive">{errors.registration_number.message}</p>
              )}
            </div>

            {inlineError && (
              <Alert variant="destructive" className="max-w-sm">
                <AlertDescription>{inlineError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {createdUser && (
        <UserCredentialsPrint user={createdUser} onClose={() => setCreatedUser(null)} />
      )}
    </div>
  );
}
