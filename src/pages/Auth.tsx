import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Building2, Briefcase, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/sentry';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
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

  // UX-007: Password strength calculation with strict requirements
  const calculatePasswordStrength = (pwd: string): 'weak' | 'medium' | 'strong' => {
    // Cerințe minime: 8 caractere, literă mare, literă mică, cifră
    const hasMinLength = pwd.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    // Weak: Nu îndeplinește cerințele minime
    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
      return 'weak';
    }
    
    // Medium: Îndeplinește cerințele minime
    if (hasMinLength && hasUpperCase && hasLowerCase && hasNumber && !hasSpecial) {
      return 'medium';
    }
    
    // Strong: Include și caractere speciale
    return 'strong';
  };

  useEffect(() => {
    if (!isLogin && password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password, isLogin]);

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
      logError(error instanceof Error ? error : new Error('Reset password error'), { context: 'forgot_password' });
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
      logError(error instanceof Error ? error : new Error('Update password error'), { context: 'reset_password' });
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
        
        console.log('🟡 [AUTH] Attempting signup with accountType:', accountType);
        
        const signUpResult = await signUp(email, password, fullName, accountType || undefined);
        if (signUpResult.error) {
          const msg = (signUpResult.error.message || '').toLowerCase();
          const isAlreadyReg = msg.includes('already') || (signUpResult.error as any)?.status === 422;

          if (isAlreadyReg) {
            // 1) Încearcă autentificarea cu parola introdusă
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (!signInError && signInData?.user) {
              // 2) Am autentificat – aplicăm aceleași update-uri de profil și tracking termeni
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                try {
                  await supabase.functions.invoke('track-terms-acceptance', {
                    body: {
                      userId: user.id,
                      email: user.email,
                      termsVersion: '1.0'
                    }
                  });
                } catch (trackError) {
                  logError(trackError instanceof Error ? trackError : new Error('Terms tracking error'), { context: 'terms_acceptance_existing_user' });
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
                title: 'Cont existent – autentificat',
                description: accountType === 'entrepreneur'
                  ? 'Te-am autentificat și ți-am păstrat tipul de cont.'
                  : 'Te-am autentificat și ți-am setat contul ca „Contabil”.',
              });

              navigate('/app');
              return;
            } else {
              // 3) Parola nu e corectă – trimitem automat email de resetare
              try {
                await supabase.functions.invoke('send-reset-password', { body: { email } });
              } catch (e) {
                logError(e instanceof Error ? e : new Error('Auto reset email error'), { context: 'auto_password_reset', email });
              }

              toast({
                title: 'Email deja înregistrat',
                description: 'Ți-am trimis un link de resetare a parolei. După autentificare, vom seta contul conform selecției tale.',
              });

              // Comută la login după reset
              setIsForgotPassword(false);
              setIsLogin(true);
              return;
            }
          }

          // Alte erori – propagă
          throw signUpResult.error;
        }
        
        // Update profile with account type and terms acceptance
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('🟡 [AUTH] User created, verifying profile update for accountType:', accountType);
          
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
            logError(trackError instanceof Error ? trackError : new Error('Terms tracking error'), { context: 'terms_acceptance_new_user' });
            // Don't block registration if tracking fails
          }

          const { data: profileUpdate, error: updateError } = await supabase
            .from('profiles')
            .update({ 
              subscription_type: accountType,
              account_type_selected: true,
              terms_accepted: true,
              terms_accepted_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select();
            
          console.log('🟡 [AUTH] Profile update result:', profileUpdate, 'Error:', updateError);
          
          // Verify the profile was updated correctly
          const { data: verifyProfile } = await supabase
            .from('profiles')
            .select('subscription_type, account_type_selected')
            .eq('id', user.id)
            .single();
            
          console.log('🟡 [AUTH] Profile verification after update:', verifyProfile);
        }
        
        toast({
          title: "Cont creat cu succes!",
          description: accountType === 'entrepreneur' 
            ? "Contul tău de antreprenor a fost configurat cu succes! Ai 30 de zile gratuite!" 
            : "Contul tău de contabil a fost configurat cu succes! Ai 30 de zile gratuite!",
        });
        
        // Track Google Ads conversion
        if (typeof window !== 'undefined' && (window as any).gtag_report_conversion) {
          (window as any).gtag_report_conversion();
        }
        
        // TOȚI utilizatorii merg la /app indiferent de tip
        // Pagina /app va decide ce modul să afișeze
        navigate('/app');
      }
    } catch (error: any) {
      logError(error instanceof Error ? error : new Error('Auth error'), { context: 'authentication' });
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
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Ascunde parola" : "Arată parola"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 8 caractere: litere mari/mici, cifre</p>
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
                  autoComplete="email"
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
                      autoComplete="name"
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
                  autoComplete="email"
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "••••••••" : "Min. 8 caractere: A-Z, a-z, 0-9"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isLogin ? 6 : 8}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {!isLogin && passwordStrength && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <div className={`h-1 flex-1 rounded ${
                        passwordStrength === 'weak' ? 'bg-red-500' : 
                        passwordStrength === 'medium' ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`} />
                      <span className={`text-xs font-medium ${
                        passwordStrength === 'weak' ? 'text-red-500' : 
                        passwordStrength === 'medium' ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>
                        {passwordStrength === 'weak' ? 'Slabă' : 
                         passwordStrength === 'medium' ? 'Medie' : 
                         'Puternică'}
                      </span>
                    </div>
                    {passwordStrength === 'weak' && (
                      <p className="text-xs text-red-500">
                        Obligatoriu: min. 8 caractere, litere mari/mici, cifre
                      </p>
                    )}
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-md border-2 border-primary/20">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor="terms"
                      className="text-sm leading-relaxed cursor-pointer select-none"
                    >
                      Accept termenii aplicației.
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Citește
                      {' '}
                      <Link to="/terms" target="_blank" rel="noopener" className="text-primary hover:underline font-semibold">Termenii și Condițiile</Link>
                      {' '}și{' '}
                      <Link to="/privacy" target="_blank" rel="noopener" className="text-primary hover:underline font-semibold">Politica de Confidențialitate</Link>.
                    </p>
                    <span className="text-[10px] text-muted-foreground block">
                      (La acceptare, se înregistrează emailul, IP-ul și data, în scopuri legale)
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  (!isLogin && (
                    !fullName.trim() ||
                    !email.trim() ||
                    !password ||
                    !accountType ||
                    !termsAccepted ||
                    calculatePasswordStrength(password) === 'weak'
                  ))
                }
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
              
              <div className="text-center text-xs text-muted-foreground space-y-2">
                <div>
                  Prin {isLogin ? 'autentificare' : 'înregistrare'}, ești de acord cu{' '}
                  <Link to="/terms" target="_blank" className="text-primary hover:underline">
                    Termenii și Condițiile
                  </Link>
                  {' '}și{' '}
                  <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                    Politica de Confidențialitate
                  </Link>
                </div>
                <div>
                  <Link to="/my-ai-costs" className="text-primary hover:underline font-medium">
                    📋 Vezi Politica de Tarife și Costuri
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
