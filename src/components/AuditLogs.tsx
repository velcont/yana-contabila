import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Search, FileText, Shield, Users, Mail, Database, AlertTriangle, Lock, Eye, Radio } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

const SUSPICIOUS_ACTIONS = [
  "ADMIN_ACCESS",
  "ADMIN_SENSITIVE_ACCESS",
  "SUSPICIOUS_PROFILE_ACCESS",
  "SECURITY_EVENT",
  "ADMIN_ACCESS_VIEW",
  "ADMIN_ACCESS_UPDATE",
  "ADMIN_ACCESS_DELETE",
];

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTable, setFilterTable] = useState<string>("all");
  const [securityFilter, setSecurityFilter] = useState<"all" | "suspicious" | "normal">("all");
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "disconnected">("disconnected");
  const [newEventCount, setNewEventCount] = useState(0);

  useEffect(() => {
    fetchAuditLogs();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, filterAction, filterTable, securityFilter]);

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
      toast.error("Eroare la încărcarea audit logs");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("audit-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
        },
        (payload) => {
          const newLog = payload.new as AuditLog;
          
          // Add new log to the top
          setLogs((prev) => [newLog, ...prev]);
          setNewEventCount((prev) => prev + 1);
          
          // Check if it's a suspicious event
          const isSuspicious = isSuspiciousAction(newLog.action_type);
          
          if (isSuspicious) {
            toast.error("🚨 Eveniment Suspect Detectat!", {
              description: `${newLog.action_type} - ${newLog.user_email || "Unknown"} - ${newLog.table_name}`,
              duration: 10000,
            });
          } else {
            toast.info("📝 Eveniment Nou Audit", {
              description: `${newLog.action_type} - ${newLog.user_email || "Unknown"}`,
              duration: 3000,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          toast.success("✅ Monitorizare în Timp Real Activă", {
            description: "Toate evenimentele de securitate vor fi afișate instant",
          });
        } else if (status === "CLOSED") {
          setRealtimeStatus("disconnected");
          toast.warning("⚠️ Conexiune Realtime Închisă", {
            description: "Reconectare automată...",
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Security filter
    if (securityFilter === "suspicious") {
      filtered = filtered.filter((log) => isSuspiciousAction(log.action_type));
    } else if (securityFilter === "normal") {
      filtered = filtered.filter((log) => !isSuspiciousAction(log.action_type));
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.ip_address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (filterAction !== "all") {
      filtered = filtered.filter((log) => log.action_type === filterAction);
    }

    // Table filter
    if (filterTable !== "all") {
      filtered = filtered.filter((log) => log.table_name === filterTable);
    }

    setFilteredLogs(filtered);
  };

  const isSuspiciousAction = (action: string): boolean => {
    return SUSPICIOUS_ACTIONS.some((suspiciousAction) =>
      action.includes(suspiciousAction)
    );
  };

  const getActionColor = (action: string) => {
    if (isSuspiciousAction(action)) {
      return "bg-red-500 animate-pulse";
    }
    switch (action) {
      case "INSERT":
        return "bg-green-500";
      case "UPDATE":
        return "bg-blue-500";
      case "DELETE":
        return "bg-orange-500";
      case "LOGIN":
        return "bg-purple-500";
      case "EXPORT":
        return "bg-yellow-500";
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
      case "profiles":
        return <Lock className="h-4 w-4 text-red-500" />;
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
      profiles: "🔒 Profile (SENSIBIL)",
      audit_logs: "🔒 Audit Logs",
    };
    return names[tableName] || tableName;
  };

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action_type)));
  const uniqueTables = Array.from(new Set(logs.map((log) => log.table_name)));
  const suspiciousCount = logs.filter((log) => isSuspiciousAction(log.action_type)).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jurnal Audit - Monitorizare Securitate</CardTitle>
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
    <div className="space-y-4">
      {/* Realtime Status Banner */}
      <Alert className={realtimeStatus === "connected" ? "border-green-500 bg-green-50" : "border-orange-500 bg-orange-50"}>
        <Radio className={`h-4 w-4 ${realtimeStatus === "connected" ? "text-green-600 animate-pulse" : "text-orange-600"}`} />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Monitorizare în Timp Real:</strong>{" "}
            {realtimeStatus === "connected" ? (
              <span className="text-green-600">✅ Activă - Toate evenimentele sunt monitorizate instant</span>
            ) : (
              <span className="text-orange-600">⚠️ Reconectare...</span>
            )}
          </span>
          {newEventCount > 0 && (
            <Badge variant="destructive" className="animate-bounce">
              {newEventCount} evenimente noi
            </Badge>
          )}
        </AlertDescription>
      </Alert>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Evenimente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">Ultimele 500 intrări</p>
          </CardContent>
        </Card>
        <Card className="border-red-500 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">🚨 Evenimente Suspicioase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{suspiciousCount}</div>
            <p className="text-xs text-red-600">Necesită investigare</p>
          </CardContent>
        </Card>
        <Card className="border-green-500 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">✅ Evenimente Normale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{logs.length - suspiciousCount}</div>
            <p className="text-xs text-green-600">Operațiuni standard</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Audit Logs Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Jurnal Audit - Monitorizare Securitate
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchAuditLogs();
                setNewEventCount(0);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Reîncarcă
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută după email, acțiune, tabel sau IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Security Filter */}
            <Select value={securityFilter} onValueChange={(value: any) => setSecurityFilter(value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Nivel Securitate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🔍 Toate Evenimentele</SelectItem>
                <SelectItem value="suspicious">🚨 Doar Suspicioase ({suspiciousCount})</SelectItem>
                <SelectItem value="normal">✅ Doar Normale ({logs.length - suspiciousCount})</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Tip Acțiune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate Acțiunile</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {isSuspiciousAction(action) && "🚨 "}
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
            <AnimatePresence>
              <div className="space-y-4">
                {filteredLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nu există înregistrări de audit sau niciun rezultat pentru filtrele selectate.
                  </p>
                ) : (
                  filteredLogs.map((log) => {
                    const isSuspicious = isSuspiciousAction(log.action_type);
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                      >
                        <Card 
                          className={`p-4 ${
                            isSuspicious 
                              ? "border-red-500 border-2 bg-red-50 shadow-lg" 
                              : "hover:shadow-md transition-shadow"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="mt-1">{getTableIcon(log.table_name)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {isSuspicious && (
                                    <Badge variant="destructive" className="animate-pulse">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      SUSPECT
                                    </Badge>
                                  )}
                                  <Badge className={getActionColor(log.action_type)}>
                                    {log.action_type}
                                  </Badge>
                                  <Badge variant="outline">
                                    {getTableDisplayName(log.table_name)}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(log.created_at), "dd MMM yyyy, HH:mm:ss", {
                                      locale: ro,
                                    })}
                                  </span>
                                </div>
                                
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">
                                    👤 {log.user_email || "Utilizator Necunoscut"}
                                  </p>
                                  {log.ip_address && (
                                    <p className="text-xs text-muted-foreground">
                                      🌐 IP: {log.ip_address}
                                    </p>
                                  )}
                                  {log.record_id && (
                                    <p className="text-xs text-muted-foreground">
                                      🔑 Record ID: {log.record_id}
                                    </p>
                                  )}
                                </div>

                                {/* Data Changes Display */}
                                {log.action_type === "UPDATE" && log.old_data && log.new_data && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <p className="font-semibold mb-1">📝 Modificări:</p>
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
                                    <p className="font-semibold mb-1">➕ Date Noi:</p>
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
                                    <p className="font-semibold mb-1">🗑️ Date Șterse:</p>
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
                      </motion.div>
                    );
                  })
                )}
              </div>
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
