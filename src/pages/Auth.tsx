import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Building2, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const [accountType, setAccountType] = useState<'entrepreneur' | 'accounting_firm' | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
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
        
        // TOȚI utilizatorii merg la /app indiferent de tip
        // Pagina /app va decide ce modul să afișeze
        navigate('/app');
      } else {
        if (!fullName.trim()) {
          throw new Error("Te rog introdu numele complet");
        }
        
        if (!accountType) {
          throw new Error("Te rog selectează tipul de cont");
        }

        if (!termsAccepted) {
          throw new Error("Trebuie să accepți Termenii și Condițiile pentru a crea un cont");
        }
        
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        
        // Skip pre-check: permitem înscrierea chiar dacă există un profil vechi cu alt tip.
        // Curățarea profilelor vechi se face la ștergere; continuăm cu sign-up fără a bloca aici.

        // Update profile with account type and terms acceptance
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Track terms acceptance with IP and user agent
          try {
            await supabase.functions.invoke('track-terms-acceptance', {
              body: {
                userId: user.id,
                email: user.email,
                termsVersion: '1.0'
              }
            });
          } catch (trackError) {
            console.error('Error tracking terms acceptance:', trackError);
            // Don't block registration if tracking fails
          }

          await supabase
            .from('profiles')
            .update({ 
              subscription_type: accountType,
              account_type_selected: true,
              terms_accepted: true,
              terms_accepted_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }
        
        toast({
          title: "Cont creat cu succes!",
          description: accountType === 'entrepreneur' 
            ? "Contul tău de antreprenor a fost configurat cu succes! Ai 3 luni gratuite!" 
            : "Contul tău de contabil a fost configurat cu succes! Ai 3 luni gratuite!",
        });
        
        // TOȚI utilizatorii merg la /app indiferent de tip
        // Pagina /app va decide ce modul să afișeze
        navigate('/app');
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
                <>
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
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Tip cont *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Card 
                        className={`cursor-pointer border-2 transition-all ${
                          accountType === 'entrepreneur' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                            : 'border-border hover:border-blue-300'
                        }`}
                        onClick={() => setAccountType('entrepreneur')}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col items-center text-center space-y-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              accountType === 'entrepreneur' ? 'bg-blue-500' : 'bg-blue-400'
                            }`}>
                              <Briefcase className="h-4 w-4 text-white" />
                            </div>
                            <span className={`text-xs font-medium ${
                              accountType === 'entrepreneur' ? 'text-blue-600 dark:text-blue-400' : ''
                            }`}>
                              Antreprenor
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card 
                        className={`cursor-pointer border-2 transition-all ${
                          accountType === 'accounting_firm' 
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                            : 'border-border hover:border-green-300'
                        }`}
                        onClick={() => setAccountType('accounting_firm')}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col items-center text-center space-y-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              accountType === 'accounting_firm' ? 'bg-green-500' : 'bg-green-400'
                            }`}>
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <span className={`text-xs font-medium ${
                              accountType === 'accounting_firm' ? 'text-green-600 dark:text-green-400' : ''
                            }`}>
                              Contabil
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </>
              )}
              
              {isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Tipuri de conturi disponibile
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 opacity-75">
                      <CardContent className="p-3">
                        <div className="flex flex-col items-center text-center space-y-1">
                          <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center">
                            <Briefcase className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            Antreprenor
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/10 opacity-75">
                      <CardContent className="p-3">
                        <div className="flex flex-col items-center text-center space-y-1">
                          <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            Contabil
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Alege-ți tipul de cont la înregistrare
                  </p>
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

              {!isLogin && (
                <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-md border-2 border-primary/20">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    className="mt-1"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    Accept <a href="/terms" target="_blank" className="text-primary hover:underline font-semibold">Termenii și Condițiile</a> și{' '}
                    <a href="/privacy" target="_blank" className="text-primary hover:underline font-semibold">Politica de Confidențialitate</a>.
                    {' '}
                    <span className="text-xs text-muted-foreground block mt-1">
                      (Prin acceptare, se va înregistra emailul, IP-ul și data acceptării în scopuri legale)
                    </span>
                  </label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || (!isLogin && !termsAccepted)}
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
    </div>
  );
};

export default Auth;
