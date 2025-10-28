import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  BookmarkIcon, 
  Star, 
  Trash2, 
  Search, 
  Tag,
  CheckSquare,
  TrendingUp,
  Target,
  Lightbulb,
  Users,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface SavedStrategy {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_favorite: boolean;
  action_items: string[];
  created_at: string;
}

const categoryIcons: Record<string, any> = {
  marketing: TrendingUp,
  sales: DollarSign,
  operations: Target,
  competitive: Users,
  innovation: Lightbulb,
  general: BookmarkIcon
};

const categoryColors: Record<string, string> = {
  marketing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  sales: "bg-green-500/10 text-green-600 dark:text-green-400",
  operations: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  competitive: "bg-red-500/10 text-red-600 dark:text-red-400",
  innovation: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  general: "bg-gray-500/10 text-gray-600 dark:text-gray-400"
};

export const SavedStrategies = () => {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<SavedStrategy[]>([]);
  const [filteredStrategies, setFilteredStrategies] = useState<SavedStrategy[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStrategies();
  }, [user]);

  useEffect(() => {
    filterStrategies();
  }, [searchQuery, selectedCategory, strategies]);

  const loadStrategies = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map data to proper types with explicit casting
      const mappedData = (data || []).map(item => ({
        ...item,
        tags: (item.tags as any) as string[],
        action_items: (item.action_items as any) as string[]
      })) as SavedStrategy[];
      
      setStrategies(mappedData);
    } catch (error) {
      console.error("Error loading strategies:", error);
      toast.error("Nu s-au putut încărca strategiile salvate");
    } finally {
      setIsLoading(false);
    }
  };

  const filterStrategies = () => {
    let filtered = strategies;

    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedCategory !== "all") {
      if (selectedCategory === "favorites") {
        filtered = filtered.filter(s => s.is_favorite);
      } else {
        filtered = filtered.filter(s => s.category === selectedCategory);
      }
    }

    setFilteredStrategies(filtered);
  };

  const toggleFavorite = async (strategyId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_strategies')
        .update({ is_favorite: !currentFavorite })
        .eq('id', strategyId);

      if (error) throw error;

      setStrategies(prev => prev.map(s => 
        s.id === strategyId ? { ...s, is_favorite: !currentFavorite } : s
      ));
      
      toast.success(!currentFavorite ? "Adăugat la favorite" : "Eliminat din favorite");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Eroare la actualizare");
    }
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState<string | null>(null);

  const deleteStrategy = async (strategyId: string) => {
    try {
      const { error } = await supabase
        .from('saved_strategies')
        .delete()
        .eq('id', strategyId);

      if (error) throw error;

      setStrategies(prev => prev.filter(s => s.id !== strategyId));
      toast.success("Strategie ștearsă");
    } catch (error) {
      console.error("Error deleting strategy:", error);
      toast.error("Eroare la ștergere");
    } finally {
      setDeleteDialogOpen(false);
      setStrategyToDelete(null);
    }
  };

  const categories = [
    { id: "all", label: "Toate", count: strategies.length },
    { id: "favorites", label: "Favorite", count: strategies.filter(s => s.is_favorite).length },
    { id: "marketing", label: "Marketing", count: strategies.filter(s => s.category === "marketing").length },
    { id: "sales", label: "Sales", count: strategies.filter(s => s.category === "sales").length },
    { id: "operations", label: "Operațiuni", count: strategies.filter(s => s.category === "operations").length },
    { id: "competitive", label: "Competiție", count: strategies.filter(s => s.category === "competitive").length },
    { id: "innovation", label: "Inovație", count: strategies.filter(s => s.category === "innovation").length },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookmarkIcon className="w-5 h-5 text-primary" />
            Strategii Salvate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Caută strategii..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Filter */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-4 lg:grid-cols-7">
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                  {cat.label} ({cat.count})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Strategies List */}
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Se încarcă...
              </div>
            ) : filteredStrategies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookmarkIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nu există strategii salvate</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStrategies.map((strategy) => {
                  const CategoryIcon = categoryIcons[strategy.category] || BookmarkIcon;
                  const categoryColor = categoryColors[strategy.category] || categoryColors.general;
                  
                  return (
                    <Card key={strategy.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded ${categoryColor}`}>
                                <CategoryIcon className="w-4 h-4" />
                              </div>
                              <h3 className="font-semibold">{strategy.title}</h3>
                              {strategy.is_favorite && (
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {strategy.content}
                            </p>

                            {strategy.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {strategy.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {strategy.action_items.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium flex items-center gap-1">
                                  <CheckSquare className="w-3 h-3" />
                                  Acțiuni:
                                </p>
                                <ul className="text-xs text-muted-foreground space-y-0.5 pl-4">
                                  {strategy.action_items.slice(0, 3).map((item, idx) => (
                                    <li key={idx}>• {item}</li>
                                  ))}
                                  {strategy.action_items.length > 3 && (
                                    <li>... +{strategy.action_items.length - 3} mai multe</li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFavorite(strategy.id, strategy.is_favorite)}
                              aria-label={strategy.is_favorite ? "Elimină din favorite" : "Adaugă la favorite"}
                            >
                              <Star className={`w-4 h-4 ${strategy.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setStrategyToDelete(strategy.id);
                                setDeleteDialogOpen(true);
                              }}
                              aria-label="Șterge strategia"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {new Date(strategy.created_at).toLocaleDateString('ro-RO', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sigur vrei să ștergi această strategie?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune este permanentă și nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStrategyToDelete(null)}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => strategyToDelete && deleteStrategy(strategyToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};