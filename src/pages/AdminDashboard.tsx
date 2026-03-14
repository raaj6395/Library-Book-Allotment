import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Play, LogOut, Upload, GraduationCap, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddBookForm from '@/components/admin/AddBookForm';
import AddUserForm from '@/components/admin/AddUserForm';
import AllotmentSection from '@/components/admin/AllotmentSection';
import StudentUploadSection from '@/components/admin/StudentUploadSection';
import BulkBookUpload from '@/components/admin/BulkBookUpload';
import { SessionBanner } from '@/components/admin/SessionBanner';
import { SessionSection } from '@/components/admin/SessionSection';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSessionChange = () => {
    setSessionRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Left */}
          <div className="flex items-center gap-3 text-center sm:text-left">
            <img
              src="/mnnit-logo.png"
              alt="MNNIT Logo"
              className="h-10 sm:h-12 md:h-14 w-auto flex-shrink-0"
            />

            <div className="leading-tight">
              <h1 className="text-sm sm:text-lg md:text-xl font-semibold">
                Central Library - Book Allotment System
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                MNNIT Allahabad
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
            <span className="text-xs sm:text-sm text-muted-foreground text-center">
              Welcome, {user?.name}
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={handleLogout}
              className="flex items-center"
            >
              <LogOut className="mr-1 h-4 w-4" />
              Logout
            </Button>
          </div>

        </div>
      </header>

      {/* Session Status Banner */}
      <SessionBanner refreshKey={sessionRefreshKey} />

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8">

        <Tabs defaultValue="session" className="w-full space-y-6">

          {/* Tabs */}
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 h-auto p-1">

            <TabsTrigger
              value="session"
              className="flex items-center justify-center w-full text-xs sm:text-sm py-2"
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Session
            </TabsTrigger>

            <TabsTrigger
              value="books"
              className="flex items-center justify-center w-full text-xs sm:text-sm py-2"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Books
            </TabsTrigger>

            <TabsTrigger
              value="users"
              className="flex items-center justify-center w-full text-xs sm:text-sm py-2"
            >
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>

            <TabsTrigger
              value="allotment"
              className="flex items-center justify-center w-full text-xs sm:text-sm py-2"
            >
              <Play className="mr-2 h-4 w-4" />
              Allotment
            </TabsTrigger>

            <TabsTrigger
              value="students"
              className="flex items-center justify-center w-full text-xs sm:text-sm py-2"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Student Data
            </TabsTrigger>

            <TabsTrigger
              value="book-upload"
              className="flex items-center justify-center w-full text-xs sm:text-sm py-2"
            >
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </TabsTrigger>

          </TabsList>

          {/* Tab Contents */}
          <div className="w-full">

            <TabsContent value="session" className="mt-4">
              <SessionSection onSessionChange={handleSessionChange} />
            </TabsContent>

            <TabsContent value="books" className="mt-4">
              <AddBookForm />
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <AddUserForm />
            </TabsContent>

            <TabsContent value="allotment" className="mt-4">
              <AllotmentSection />
            </TabsContent>

            <TabsContent value="students" className="mt-4">
              <StudentUploadSection />
            </TabsContent>

            <TabsContent value="book-upload" className="mt-4">
              <BulkBookUpload />
            </TabsContent>

          </div>

        </Tabs>

      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs sm:text-sm text-muted-foreground">
        © {new Date().getFullYear()} Central Library – MNNIT Allahabad
      </footer>

    </div>
  );
}
