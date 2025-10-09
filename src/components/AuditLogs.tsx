import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Search, FileText, Shield, Users, Mail, Database } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action_type: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTable, setFilterTable] = useState<string>("all");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, filterAction, filterTable]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.table_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by action type
    if (filterAction !== "all") {
      filtered = filtered.filter((log) => log.action_type === filterAction);
    }

    // Filter by table
    if (filterTable !== "all") {
      filtered = filtered.filter((log) => log.table_name === filterTable);
    }

    setFilteredLogs(filtered);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT":
        return "bg-green-500";
      case "UPDATE":
        return "bg-blue-500";
      case "DELETE":
        return "bg-red-500";
      case "LOGIN":
        return "bg-purple-500";
      case "EXPORT":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case "analyses":
        return <FileText className="h-4 w-4" />;
      case "companies":
        return <Database className="h-4 w-4" />;
      case "user_roles":
        return <Shield className="h-4 w-4" />;
      case "email_broadcasts":
        return <Mail className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const names: { [key: string]: string } = {
      analyses: "Analize",
      companies: "Companii",
      analysis_shares: "Partajări Analize",
      analysis_comments: "Comentarii",
      conversation_history: "Conversații AI",
      user_roles: "Roluri Utilizatori",
      email_broadcasts: "Broadcast Email",
      favorite_analyses: "Favorite",
      research_data: "Date Cercetare",
    };
    return names[tableName] || tableName;
  };

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action_type)));
  const uniqueTables = Array.from(new Set(logs.map((log) => log.table_name)));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jurnal Audit - Toate Acțiunile</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută după email, acțiune sau tabel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Tip Acțiune" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate Acțiunile</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTable} onValueChange={setFilterTable}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Tabel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate Tabelele</SelectItem>
              {uniqueTables.map((table) => (
                <SelectItem key={table} value={table}>
                  {getTableDisplayName(table)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {filteredLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nu există înregistrări de audit sau niciun rezultat pentru filtrele selectate.
              </p>
            ) : (
              filteredLogs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{getTableIcon(log.table_name)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getActionColor(log.action_type)}>
                            {log.action_type}
                          </Badge>
                          <Badge variant="outline">
                            {getTableDisplayName(log.table_name)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", {
                              locale: ro,
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {log.user_email || "Utilizator Necunoscut"}
                        </p>
                        {log.action_type === "UPDATE" && log.old_data && log.new_data && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p className="font-semibold mb-1">Modificări:</p>
                            <div className="bg-muted p-2 rounded">
                              {Object.keys(log.new_data).map((key) => {
                                if (
                                  log.old_data[key] !== log.new_data[key] &&
                                  !["id", "created_at", "updated_at", "user_id"].includes(key)
                                ) {
                                  return (
                                    <div key={key} className="mb-1">
                                      <span className="font-medium">{key}:</span>
                                      <span className="line-through text-red-500 ml-2">
                                        {String(log.old_data[key]).substring(0, 50)}
                                      </span>
                                      <span className="text-green-500 ml-2">
                                        → {String(log.new_data[key]).substring(0, 50)}
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        )}
                        {log.action_type === "INSERT" && log.new_data && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p className="font-semibold mb-1">Date Noi:</p>
                            <div className="bg-muted p-2 rounded">
                              {Object.entries(log.new_data)
                                .filter(
                                  ([key]) =>
                                    !["id", "created_at", "updated_at", "user_id"].includes(key)
                                )
                                .slice(0, 3)
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span>{" "}
                                    {String(value).substring(0, 50)}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        {log.action_type === "DELETE" && log.old_data && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p className="font-semibold mb-1">Date Șterse:</p>
                            <div className="bg-muted p-2 rounded">
                              {Object.entries(log.old_data)
                                .filter(
                                  ([key]) =>
                                    !["id", "created_at", "updated_at", "user_id"].includes(key)
                                )
                                .slice(0, 3)
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span>{" "}
                                    {String(value).substring(0, 50)}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
