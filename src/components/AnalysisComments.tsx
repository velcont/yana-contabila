import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface AnalysisCommentsProps {
  analysisId: string;
}

export const AnalysisComments = ({ analysisId }: AnalysisCommentsProps) => {
  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();

  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['analysis-comments', analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!commentText.trim()) {
        throw new Error("Comentariul nu poate fi gol");
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Nu ești autentificat");

      const { error } = await supabase
        .from('analysis_comments')
        .insert({
          analysis_id: analysisId,
          user_id: userData.user.id,
          comment_text: commentText.trim(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-comments', analysisId] });
      toast.success("Comentariu adăugat!");
      setCommentText("");
    },
    onError: (error: any) => {
      toast.error("Eroare: " + error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comentarii
        </CardTitle>
        <CardDescription>
          Discută cu echipa ta despre această analiză
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add comment form */}
        <div className="space-y-2">
          <Textarea
            placeholder="Scrie un comentariu..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
          />
          <Button
            onClick={() => addCommentMutation.mutate()}
            disabled={!commentText.trim() || addCommentMutation.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {addCommentMutation.isPending ? "Se trimite..." : "Trimite Comentariu"}
          </Button>
        </div>

        {/* Comments list */}
        <div className="space-y-3 border-t pt-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center">Se încarcă...</p>
          )}
          
          {comments && comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Niciun comentariu încă. Fii primul care comentează!
            </p>
          )}
          
          {comments && comments.map((comment: any) => (
            <div key={comment.id} className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {comment.profiles?.full_name || comment.profiles?.email || 'Utilizator'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: ro,
                  })}
                </p>
              </div>
              <p className="text-sm">{comment.comment_text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
