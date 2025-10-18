import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StrategicFeedbackProps {
  conversationId: string;
  messageContent: string;
  onFeedbackSent?: () => void;
}

export const StrategicFeedback = ({ 
  conversationId, 
  messageContent,
  onFeedbackSent 
}: StrategicFeedbackProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast.error("Te rog selectează un rating");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const { error } = await supabase
        .from('chat_feedback')
        .insert({
          user_id: user.id,
          conversation_message_id: null, // We don't have message IDs in strategic advisor
          rating: rating === 5 ? 1 : 0, // 1 = helpful (4-5 stars), 0 = not helpful (1-3 stars)
          feedback_text: feedbackText,
          question_category: 'strategic',
          response_length: messageContent.length,
          response_time_ms: null
        });

      if (error) throw error;

      toast.success("Mulțumim pentru feedback!");
      setShowDialog(false);
      setRating(0);
      setFeedbackText("");
      onFeedbackSent?.();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Eroare la trimiterea feedback-ului");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Star className="w-4 h-4" />
        Evaluează răspunsul
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cât de util a fost acest răspuns?</DialogTitle>
            <DialogDescription>
              Feedback-ul tău ne ajută să îmbunătățim calitatea strategiilor oferite.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {rating === 0 && "Selectează un rating"}
              {rating === 1 && "Foarte nefolositor"}
              {rating === 2 && "Nefolositor"}
              {rating === 3 && "Neutru"}
              {rating === 4 && "Util"}
              {rating === 5 && "Foarte util"}
            </div>

            <Textarea
              placeholder="(Opțional) Ce ar putea fi îmbunătățit? Ce informații lipsesc?"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isSubmitting}
              >
                Anulează
              </Button>
              <Button
                onClick={handleSubmitFeedback}
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? "Se trimite..." : "Trimite feedback"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
