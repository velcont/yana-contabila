import { useState, useEffect, useRef } from 'react'; // v3.0.0 - single unified plan
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/sentry';
import MiniFooter from '@/components/MiniFooter';
import { analytics } from '@/utils/analytics';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isMarketplaceEntry = searchParams.get('ref') === 'marketplace';
  
  // Auto-detect if coming from landing/ads → default to signup
  const comingFromLanding = document.referrer.includes('velcont.com') || 
    document.referrer.includes('lovable.app') ||
    searchParams.get('redirect') !== null ||
    searchParams.get('ref') !== null;
  
  // FIX CRITIC: Detectare IMEDIATĂ a reset mode ÎNAINTE de randare
  const detectInitialResetMode = () => {
    const hashFragment = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hashFragment);
    const hasAccessToken = hashFragment.includes('access_token');
    const isRecovery = hashParams.get('type') === 'recovery' || hashFragment.includes('type=recovery');
    const resetParam = new URLSearchParams(window.location.search).get('reset') === 'true';
    return (hasAccessToken && isRecovery) || resetParam;
  };
  
  const [isInitializing, setIsInitializing] = useState(() => detectInitialResetMode());
  const [isLogin, setIsLogin] = useState(!comingFromLanding);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(() => detectInitialResetMode());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hasTrackedPageView = useRef(false);
  const hasTrackedFormStart = useRef(false);

  // Track auth page view
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      const mode = isResetMode ? 'reset' : (isLogin ? 'login' : 'signup');
      const source = searchParams.get('redirect') ? 'redirect' : 'direct';
      analytics.authPageView(mode, source);
    }
  }, [isResetMode, isLogin, searchParams]);

  // Marketplace entry detection
  useEffect(() => {
    if (isMarketplaceEntry) {
      localStorage.setItem('marketplace_entry', 'true');
      toast({
        title: "🎉 Bine ai venit la Marketplace!",
        description: "Creează-ți cont pentru a accesa funcțiile Marketplace în perioada de trial gratuită.",
        duration: 8000,
      });
    }
  }, [isMarketplaceEntry, toast]);

  // FIX CRITIC: Inițializare și așteptare procesare token Supabase
  useEffect(() => {
    const initializeAuth = async () => {
      const hashFragment = window.location.hash.substring(1);
      const hasAccessToken = hashFragment.includes('access_token');
      const isRecovery = hashFragment.includes('type=recovery');
      
      console.log('🔐 [AUTH INIT] Starting...', { hasAccessToken, isRecovery, hash: window.location.hash });
      
      if (hasAccessToken && isRecovery) {
        console.log('🔐 [AUTH INIT] Recovery token detected - waiting for Supabase to process...');
        setIsResetMode(true);
        setIsLogin(false);
        setIsForgotPassword(false);
        
        // Așteptăm Supabase să proceseze token-ul
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificăm sesiunea
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 [AUTH INIT] Session after wait:', session?.user?.email);
        
        // Curățăm URL-ul
        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = '';
        cleanUrl.searchParams.set('reset', 'true');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
      
      setIsInitializing(false);
    };
    
    initializeAuth();
  }, []);

  // Ascultă evenimentul PASSWORD_RECOVERY de la Supabase Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 [AUTH] Auth state change:', event, session?.user?.email);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('🔐 [AUTH] PASSWORD_RECOVERY event detected');
        setIsResetMode(true);
        setIsLogin(false);
        setIsForgotPassword(false);
        setIsInitializing(false); // Oprește loading-ul când evenimentul e detectat
        
        // Curățăm URL-ul de parametrii sensibili
        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = '';
        cleanUrl.searchParams.set('reset', 'true');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Verifică și parametrii din URL și hash fragment la încărcare
  // FIX CRITIC: Așteptăm ca Supabase să proceseze token-ul din hash ÎNAINTE de a verifica sesiunea
  useEffect(() => {
    const checkResetMode = async () => {
      // Metodă 1: Verifică parametrul ?reset=true
      const resetParam = searchParams.get('reset') === 'true';
      
      // Metodă 2: Verifică parametrul type=recovery din query string
      const recoveryType = searchParams.get('type') === 'recovery';
      
      // Metodă 3: Verifică hash fragment-ul pentru type=recovery SAU access_token
      const hashFragment = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hashFragment);
      const hashRecoveryType = hashParams.get('type') === 'recovery';
      const hasAccessToken = hashFragment.includes('access_token');
      
      console.log('🔐 [AUTH] Check reset mode:', { 
        resetParam, 
        recoveryType, 
        hashRecoveryType,
        hasAccessToken,
        hash: window.location.hash
      });
      
      // FIX CRITIC: Dacă avem access_token în hash, Supabase are nevoie de timp să-l proceseze
      if (hasAccessToken && (hashRecoveryType || hashFragment.includes('type=recovery'))) {
        console.log('🔐 [AUTH] Access token detected in hash - waiting for Supabase to process...');
        
        // Setăm reset mode IMEDIAT pentru a arăta formularul corect
        setIsResetMode(true);
        setIsLogin(false);
        setIsForgotPassword(false);
        
        // Așteptăm 1.5 secunde pentru ca Supabase să proceseze token-ul din hash
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verificăm dacă sesiunea a fost creată
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 [AUTH] Session after wait:', session?.user?.email);
        
        // Curățăm URL-ul DUPĂ ce Supabase a procesat token-ul
        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = '';
        cleanUrl.searchParams.delete('type');
        cleanUrl.searchParams.delete('token');
        cleanUrl.searchParams.delete('token_hash');
        cleanUrl.searchParams.set('reset', 'true');
        window.history.replaceState({}, '', cleanUrl.toString());
        return;
      }
      
      // Activăm reset mode dacă oricare dintre metode confirmă (fără access_token)
      if (resetParam || recoveryType || hashRecoveryType) {
        console.log('🔐 [AUTH] Reset mode activated via URL params');
        setIsResetMode(true);
        setIsLogin(false);
        setIsForgotPassword(false);
        
        // Curățăm URL-ul de parametrii sensibili
        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = '';
        cleanUrl.searchParams.delete('type');
        cleanUrl.searchParams.delete('token');
        cleanUrl.searchParams.delete('token_hash');
        cleanUrl.searchParams.set('reset', 'true');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    };
    
    checkResetMode();
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
 
  // ✅ SIMPLIFICAT: Nu mai verificăm fullName - se extrage automat din email
  const emailOk = email.trim().length > 0;
  const passwordLenOk = password.length >= 8;
  const passwordStrongEnough = calculatePasswordStrength(password) !== 'weak';
  const accountTypeOk = true; // Single plan - no account type selection needed
  const termsOk = termsAccepted;

  const canRegister = isLogin ? true : (
    emailOk && passwordLenOk && passwordStrongEnough && accountTypeOk && termsOk
  );

  useEffect(() => {
    if (!isLogin) {
      console.log('[AUTH DEBUG] Flags', { emailOk, passwordLenOk, passwordStrongEnough, accountTypeOk, termsOk, canRegister });
    }
  }, [isLogin, emailOk, passwordLenOk, passwordStrongEnough, accountTypeOk, termsOk, canRegister]);

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
      console.log('🔐 [AUTH] Starting password reset...');
      
      // FIX CRITIC: Verificăm sesiunea cu retry-uri dacă token-ul e încă în procesare
      // Redus la 2 încercări cu exponential backoff pentru a preveni rate limiting
      let session = (await supabase.auth.getSession()).data.session;
      console.log('🔐 [AUTH] Initial session check:', session?.user?.email);
      
      // Dacă nu există sesiune, încercăm de 2 ori cu delay exponențial (previne rate limiting)
      if (!session) {
        console.log('🔐 [AUTH] No session - attempting retries with exponential backoff...');
        for (let i = 0; i < 2; i++) {
          // Exponential backoff: 2s, 4s
          const delay = 2000 * Math.pow(2, i);
          console.log(`🔐 [AUTH] Waiting ${delay}ms before retry ${i + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          session = (await supabase.auth.getSession()).data.session;
          console.log(`🔐 [AUTH] Retry ${i + 1}: session =`, session?.user?.email);
          if (session) break;
        }
      }
      
      if (!session) {
        console.error('🔴 [AUTH] No session found after retries');
        toast({
          title: "Link expirat sau invalid",
          description: "Linkul de resetare a expirat (valabil 1 oră) sau nu a fost inițiat corect.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setIsResetMode(false);
                setIsForgotPassword(true);
              }}
            >
              Cere un nou link
            </Button>
          ),
        });
        setIsResetMode(false);
        setIsForgotPassword(true);
        setIsLoading(false);
        return;
      }

      // 2. Validate password strength
      const strength = calculatePasswordStrength(newPassword);
      if (strength === 'weak') {
        toast({
          title: "Parolă prea slabă",
          description: "Parola trebuie să aibă minim 8 caractere, să conțină litere mari, litere mici și cifre.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // 3. Implement timeout protection (15 seconds)
      const updatePromise = supabase.auth.updateUser({ password: newPassword });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout la resetarea parolei. Verifică conexiunea și încearcă din nou.')), 15000)
      );

      console.log('🔐 [AUTH] Updating password...');
      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (error) {
        console.error('🔴 [AUTH] Password update error:', error.message);
        
        // Check if it's an expired link error
        if (error.message?.toLowerCase().includes('expired') || 
            error.message?.toLowerCase().includes('invalid') ||
            error.message?.toLowerCase().includes('token')) {
          toast({
            title: "Link expirat",
            description: "Linkul de resetare a expirat (valabil 1 oră). Cere un nou link.",
            variant: "destructive",
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsResetMode(false);
                  setIsForgotPassword(true);
                }}
              >
                Cere un nou link
              </Button>
            ),
          });
          setIsResetMode(false);
          setIsForgotPassword(true);
          return;
        }
        throw error;
      }

      console.log('✅ [AUTH] Password reset successful');
      toast({
        title: "Parolă resetată!",
        description: "Parola ta a fost schimbată cu succes.",
      });
      
      navigate('/yana');
    } catch (error: any) {
      console.error('🔴 [AUTH] Password reset error:', error);
      logError(error instanceof Error ? error : new Error('Update password error'), { context: 'reset_password' });
      
      // Provide clear error messages
      let errorMessage = "Nu s-a putut reseta parola.";
      if (error.message?.includes('Timeout')) {
        errorMessage = "Operația a durat prea mult. Verifică conexiunea la internet și încearcă din nou.";
      } else if (error.message?.toLowerCase().includes('expired') || 
                 error.message?.toLowerCase().includes('invalid')) {
        errorMessage = "Linkul de resetare a expirat sau este invalid. Cere un nou link.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Eroare",
        description: errorMessage,
        variant: "destructive",
        action: errorMessage.includes('expirat') ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setIsResetMode(false);
              setIsForgotPassword(true);
            }}
          >
            Cere un nou link
          </Button>
        ) : undefined,
      });
    } finally {
      // 4. Guaranteed loading state reset
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
        
        // Track login success
        analytics.authLoginSuccess('email');
        
        // Redirect logic: check for redirect param first, then marketplace, then default to /yana
        const redirectTo = searchParams.get('redirect');
        const isMarketplace = localStorage.getItem('marketplace_entry') === 'true';
        if (redirectTo) {
          navigate(redirectTo);
        } else if (isMarketplace) {
          navigate('/yana');
        } else {
          navigate('/yana');
        }
      } else {
        // ✅ SIMPLIFICAT: Extrage automat numele din email (înainte de @)
        const autoName = email.split('@')[0]
          .replace(/[._-]/g, ' ')  // Înlocuiește puncte, underscore, dash cu spații
          .replace(/\d+/g, '')      // Elimină cifrele
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ') || 'Utilizator';
        
        // Single plan - no account type selection needed
        const accountType = 'entrepreneur'; // Default for all users

        if (!termsAccepted) {
          throw new Error("Trebuie să accepți Termenii și Condițiile pentru a crea un cont");
        }
        
        console.log('🟡 [AUTH] Attempting signup with accountType:', accountType, 'autoName:', autoName);
        
        const signUpResult = await signUp(email, password, autoName, accountType || undefined);
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
                    subscription_type: 'entrepreneur',
                    account_type_selected: true,
                    terms_accepted: true,
                    terms_accepted_at: new Date().toISOString()
                  })
                  .eq('id', user.id);
              }

              toast({
                title: 'Cont existent – autentificat',
                description: 'Te-am autentificat cu succes!',
              });

              const redirectTo = searchParams.get('redirect');
              navigate(redirectTo || '/yana');
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
          description: "Contul tău a fost configurat cu succes! Ai 30 de zile gratuite!",
        });
        
        // Track Google Ads conversion
        if (typeof window !== 'undefined' && (window as any).gtag_report_conversion) {
          (window as any).gtag_report_conversion();
        }
        
        // Redirect logic: check for redirect param first, then marketplace, then default
        const redirectTo = searchParams.get('redirect');
        const isMarketplaceEntry = localStorage.getItem('marketplace_entry') === 'true';
        
        // Track signup success
        analytics.authSignupSuccess('email', isMarketplaceEntry);
        
        if (redirectTo) {
          navigate(redirectTo);
        } else if (isMarketplaceEntry) {
          navigate('/yana?view=marketplace');
        } else {
          navigate('/yana');
        }
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


  // FIX CRITIC: Loading screen în timpul inițializării pentru a preveni flash-ul formularului de login
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-3 md:p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Se verifică link-ul de resetare...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-3 md:p-4">
      {/* Marketplace Entry Banner */}
      {isMarketplaceEntry && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-2 md:py-3 px-3 md:px-4 text-center shadow-lg z-50">
          <p className="text-xs md:text-sm font-medium">
            🎉 Marketplace Yana - 30 zile gratuite!
          </p>
        </div>
      )}
      
      <div className="w-full max-w-lg mx-2 md:mx-0 space-y-4">
        {/* Value Proposition - shown on signup */}
        {!isLogin && !isResetMode && !isForgotPassword && (
          <div className="text-center space-y-3 px-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Partenerul tău AI de business
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Înregistrează-te gratuit și primești <span className="font-semibold text-primary">30 de zile</span> acces complet
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
              <div className="flex items-center gap-2 bg-card border rounded-lg p-2.5">
                <span className="text-primary text-base">🔍</span>
                <span className="text-foreground">Vezi unde pierzi bani</span>
              </div>
              <div className="flex items-center gap-2 bg-card border rounded-lg p-2.5">
                <span className="text-primary text-base">📊</span>
                <span className="text-foreground">Analiză financiară instant</span>
              </div>
              <div className="flex items-center gap-2 bg-card border rounded-lg p-2.5">
                <span className="text-primary text-base">🛡️</span>
                <span className="text-foreground">Alerte riscuri fiscale</span>
              </div>
              <div className="flex items-center gap-2 bg-card border rounded-lg p-2.5">
                <span className="text-primary text-base">💡</span>
                <span className="text-foreground">Sfaturi strategice 24/7</span>
              </div>
            </div>
          </div>
        )}
        
        <Card className="w-full">
        <CardHeader className="px-4 md:px-6 py-4 md:py-6">
          <CardTitle className="text-xl md:text-2xl text-center">
            {isResetMode ? 'Resetare Parolă' : isForgotPassword ? 'Recuperare Parolă' : isLogin ? 'Bine ai revenit!' : 'Creează cont gratuit'}
          </CardTitle>
          <CardDescription className="text-center text-xs md:text-sm">
            {isResetMode 
              ? 'Introdu noua ta parolă' 
              : isForgotPassword 
              ? 'Îți vom trimite un link de resetare'
              : isLogin 
              ? 'Intră în contul tău Yana' 
              : 'Doar email și parolă — ești gata în 30 de secunde'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-3 md:space-y-4">
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
              {/* Formular simplificat: fără câmp pentru Nume complet */}
              {/* Numele se extrage automat din email în handleSubmit */}
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@exemplu.ro"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
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
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "••••••••" : "Min. 8 caractere: A-Z, a-z, 0-9"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
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
                className="w-full h-11 md:h-10 text-base md:text-sm"
                disabled={
                  isLoading || (!isLogin && !canRegister)
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
              {!isLogin && (
                <div className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
                  <div className="grid grid-cols-2 gap-1">
                    <div className={emailOk ? 'text-emerald-600' : 'text-red-500'}>Email {emailOk ? '✓' : '—'}</div>
                    <div className={(passwordLenOk && passwordStrongEnough) ? 'text-emerald-600' : 'text-red-500'}>Parolă validă {(passwordLenOk && passwordStrongEnough) ? '✓' : '—'}</div>
                    <div className={termsOk ? 'text-emerald-600' : 'text-red-500'}>Termeni acceptați {termsOk ? '✓' : '—'}</div>
                  </div>
                </div>
              )}
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
                  <Link to="/pricing" className="text-primary hover:underline font-medium">
                    📋 Vezi Politica de Tarife și Costuri
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <MiniFooter />
    </div>
  );
};

export default Auth;
