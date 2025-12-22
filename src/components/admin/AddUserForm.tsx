import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usersAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Printer } from 'lucide-react';
import UserCredentialsPrint from './UserCredentialsPrint';

interface UserFormData {
  name: string;
  email: string;
  registrationNumber: string;
  course: string;
  batch: string;
  specialization: string;
}

export default function AddUserForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    defaultValues: {
      course: '',
      batch: '',
      specialization: '',
    },
  });

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      const user = await usersAPI.create(data);
      setCreatedUser(user);
      toast({
        title: 'Success',
        description: 'User created successfully!',
      });
      reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
          <CardDescription>Create a new user account with auto-generated password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Name is required' })}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  placeholder="john.doe@student.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  {...register('registrationNumber', { required: 'Registration number is required' })}
                  placeholder="STU001"
                />
                {errors.registrationNumber && (
                  <p className="text-sm text-destructive">{errors.registrationNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Input
                  id="course"
                  {...register('course')}
                  placeholder="Computer Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch">Batch</Label>
                <Input
                  id="batch"
                  {...register('batch')}
                  placeholder="2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  {...register('specialization')}
                  placeholder="Software Engineering"
                />
              </div>
            </div>

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

