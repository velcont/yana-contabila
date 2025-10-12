import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AccountTypeSelector } from '@/components/AccountTypeSelector';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAccountTypeSelector, setShowAccountTypeSelector] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're in password reset mode
    const resetMode = searchParams.get('reset') === 'true';
    if (resetMode) {
      setIsResetMode(true);
      setIsLogin(false);
      setIsForgotPassword(false);
    }
  }, [searchParams]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-reset-password', {
        body: { email }
      });

      if (error) throw error;

      toast({
        title: "Email trimis!",
        description: "Verifică-ți emailul pentru link-ul de resetare a parolei.",
      });
      
      setIsForgotPassword(false);
      setIsLogin(true);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-a putut trimite emailul de resetare.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Parolă resetată!",
        description: "Parola ta a fost schimbată cu succes.",
      });
      
      navigate('/app');
    } catch (error: any) {
      console.error('Update password error:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-a putut reseta parola.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          description: "Selectează tipul de cont pentru a continua.",
        });
        
        // Show account type selector for new users
        setShowAccountTypeSelector(true);
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

  const handleAccountTypeComplete = () => {
    setShowAccountTypeSelector(false);
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isResetMode ? 'Resetare Parolă' : isForgotPassword ? 'Recuperare Parolă' : isLogin ? 'Autentificare' : 'Înregistrare'}
          </CardTitle>
          <CardDescription className="text-center">
            {isResetMode 
              ? 'Introdu noua ta parolă' 
              : isForgotPassword 
              ? 'Îți vom trimite un link de resetare pe email'
              : isLogin 
              ? 'Intră în contul tău Yana' 
              : 'Creează un cont nou pentru a salva analizele'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium">
                  Parolă nouă
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">Minimum 6 caractere</p>
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
                  'Resetează Parola'
                )}
              </Button>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
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

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se trimite...
                  </>
                ) : (
                  'Trimite Link de Resetare'
                )}
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsLogin(true);
                  }}
                  className="text-primary hover:underline"
                >
                  ← Înapoi la autentificare
                </button>
              </div>
            </form>
          ) : (
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
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Parolă
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setIsLogin(false);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Ai uitat parola?
                    </button>
                  )}
                </div>
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
          )}

          {!isResetMode && !isForgotPassword && (
            <div className="mt-4 space-y-3">
              <div className="text-center text-sm">
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
              
              <div className="text-center text-xs text-muted-foreground">
                Prin {isLogin ? 'autentificare' : 'înregistrare'}, ești de acord cu{' '}
                <a href="/terms" className="text-primary hover:underline">
                  Termenii și Condițiile
                </a>
                {' '}și{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Politica de Confidențialitate
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AccountTypeSelector 
        open={showAccountTypeSelector} 
        onComplete={handleAccountTypeComplete}
      />
    </div>
  );
};

export default Auth;
