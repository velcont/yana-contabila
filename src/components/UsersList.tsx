import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Building2, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface UserStats {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  companies_count: number;
  analyses_count: number;
  last_analysis_date: string | null;
}

export const UsersList = () => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsersWithStats();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchUsersWithStats = async () => {
    try {
      setLoading(true);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch statistics for each user
      const usersWithStats = await Promise.all(
        profiles.map(async (profile) => {
          // Count companies
          const { count: companiesCount } = await supabase
            .from("companies")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          // Count analyses
          const { count: analysesCount } = await supabase
            .from("analyses")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          // Get last analysis date
          const { data: lastAnalysis } = await supabase
            .from("analyses")
            .select("created_at")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...profile,
            companies_count: companiesCount || 0,
            analyses_count: analysesCount || 0,
            last_analysis_date: lastAnalysis?.created_at || null,
          };
        })
      );

      setUsers(usersWithStats);
      setFilteredUsers(usersWithStats);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityBadge = (lastAnalysisDate: string | null) => {
    if (!lastAnalysisDate) return <Badge variant="outline">Inactiv</Badge>;

    const daysSinceLastAnalysis = Math.floor(
      (Date.now() - new Date(lastAnalysisDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastAnalysis <= 7) {
      return <Badge className="bg-success text-success-foreground">Activ</Badge>;
    } else if (daysSinceLastAnalysis <= 30) {
      return <Badge variant="secondary">Moderat</Badge>;
    } else {
      return <Badge variant="outline">Inactiv</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Utilizatori Înregistrați</h2>
          <p className="text-muted-foreground">
            Total: {users.length} utilizatori
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Caută după email sau nume..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {searchTerm ? "Niciun utilizator găsit" : "Niciun utilizator înregistrat"}
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {user.full_name || "Fără nume"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  {getActivityBadge(user.last_analysis_date)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {user.companies_count} {user.companies_count === 1 ? "firmă" : "firme"}
                      </p>
                      <p className="text-xs text-muted-foreground">Companii</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {user.analyses_count} {user.analyses_count === 1 ? "analiză" : "analize"}
                      </p>
                      <p className="text-xs text-muted-foreground">Analize efectuate</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {user.last_analysis_date
                          ? format(new Date(user.last_analysis_date), "d MMM yyyy", {
                              locale: ro,
                            })
                          : "Niciodată"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.last_analysis_date ? "Ultima analiză" : "Nicio analiză"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  Înregistrat: {format(new Date(user.created_at), "d MMMM yyyy, HH:mm", { locale: ro })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
