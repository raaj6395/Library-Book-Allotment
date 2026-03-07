import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">

      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2">

          <div className="flex items-center gap-3 text-center sm:text-left">
            <img
              src="/mnnit-logo.png"
              alt="MNNIT Logo"
              className="h-10 sm:h-12 md:h-14 w-auto flex-shrink-0"
            />

            <div className="leading-tight">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold">
                Central Library – Book Allotment System
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                MNNIT Allahabad
              </p>
            </div>
          </div>

        </div>
      </header>


      {/* Login Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center">
              Library Portal Login
            </CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email / Registration</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@library.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

            </form>


            {/* Demo credentials */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-2">Demo Credentials:</p>
              <p className="text-xs text-muted-foreground">
                Admin: admin@library.com / admin123
              </p>
              <p className="text-xs text-muted-foreground">
                User: john.doe@student.com / user123
              </p>
            </div>

          </CardContent>
        </Card>
      </main>


      {/* Footer */}
      <footer className="border-t bg-white py-4 text-center text-xs sm:text-sm text-muted-foreground">
        © {new Date().getFullYear()} Central Library – MNNIT Allahabad
      </footer>

    </div>
  );
}