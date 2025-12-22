import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { booksAPI, usersAPI, allotmentAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Users, BookOpen, Play, LogOut, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddBookForm from '@/components/admin/AddBookForm';
import AddUserForm from '@/components/admin/AddUserForm';
import AllotmentSection from '@/components/admin/AllotmentSection';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="books" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="books">
              <BookOpen className="mr-2 h-4 w-4" />
              Add Book
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Add User
            </TabsTrigger>
            <TabsTrigger value="allotment">
              <Play className="mr-2 h-4 w-4" />
              Run Allotment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="books">
            <AddBookForm />
          </TabsContent>

          <TabsContent value="users">
            <AddUserForm />
          </TabsContent>

          <TabsContent value="allotment">
            <AllotmentSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

