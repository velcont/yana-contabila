import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const TrialReminderDialog = () => {
  const [open, setOpen] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const checkTrialStatus = async () => {
      // Check if we've already shown the dialog in this session
      const shownThisSession = sessionStorage.getItem('trial_reminder_shown');
      if (shownThisSession === 'true') {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_ends_at, subscription_status')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      // Only show if:
      // 1. User is not on active subscription
      // 2. User has a trial_ends_at date
      if (profile.subscription_status === 'active' || !profile.trial_ends_at) {
        return;
      }

      const trialEndDate = new Date(profile.trial_ends_at);
      const now = new Date();
      const diffTime = trialEndDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        setDaysRemaining(diffDays);
        setOpen(true);
        sessionStorage.setItem('trial_reminder_shown', 'true');
      }
    };

    checkTrialStatus();
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  if (daysRemaining === null) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-6 w-6 text-primary" />
            Perioada ta de gratuitate
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center gap-3 p-6 bg-primary/10 rounded-lg">
            <Calendar className="h-8 w-8 text-primary" />
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{daysRemaining}</p>
              <p className="text-sm text-muted-foreground">
                {daysRemaining === 1 ? 'zi rămasă' : 'zile rămase'}
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Mai ai <strong>{daysRemaining} {daysRemaining === 1 ? 'zi' : 'zile'}</strong> din perioada ta gratuită de 3 luni.
            {daysRemaining <= 7 && (
              <span className="block mt-2 text-amber-600 font-medium">
                ⚠️ Perioada ta gratuită se apropie de sfârșit!
              </span>
            )}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} variant="default">
            Am înțeles
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
