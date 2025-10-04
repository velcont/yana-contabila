import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        toast({
          title: "Autentificare reușită!",
          description: "Bine ai revenit!",
        });
        navigate('/app');
      } else {
        if (!fullName.trim()) {
          throw new Error("Te rog introdu numele complet");
        }
        
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        
        toast({
          title: "Cont creat cu succes!",
          description: "Te poți autentifica acum.",
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare. Te rog încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isLogin ? 'Autentificare' : 'Înregistrare'}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin 
              ? 'Intră în contul tău Yana' 
              : 'Creează un cont nou pentru a salva analizele'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Nume complet
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ion Popescu"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplu.ro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Parolă
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se procesează...
                </>
              ) : (
                isLogin ? 'Autentificare' : 'Înregistrare'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {isLogin ? (
              <>
                Nu ai cont?{' '}
                <button
                  onClick={() => setIsLogin(false)}
                  className="text-primary hover:underline font-medium"
                >
                  Înregistrează-te
                </button>
              </>
            ) : (
              <>
                Ai deja cont?{' '}
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Autentifică-te
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
