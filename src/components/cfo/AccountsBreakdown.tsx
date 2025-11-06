import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import type { AccountBalance, AccountActivity, FullBalanceMetadata } from "@/types/accountingStructure";

interface AccountsBreakdownProps {
  metadata: FullBalanceMetadata | null;
}

export const AccountsBreakdown = ({ metadata }: AccountsBreakdownProps) => {
  if (!metadata) return null;
  
  const renderAccountList = (accounts: AccountBalance[] | undefined, title: string, className: string = "") => {
    if (!accounts || accounts.length === 0) return null;
    
    return (
      <div className={className}>
        <h4 className="font-semibold mb-3 text-foreground">{title}</h4>
        <div className="space-y-2">
          {accounts.map((acc, idx) => (
            <div 
              key={idx} 
              className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
            >
              <span className="text-sm font-medium text-foreground">
                {acc.accountCode} - {acc.accountName}
              </span>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={acc.balanceType === 'debit' ? 'default' : 'secondary'}
                  className="font-mono"
                >
                  {Math.abs(acc.netBalance).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                </Badge>
                {acc.balanceType === 'debit' ? (
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-orange-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderActivityList = (accounts: AccountActivity[] | undefined, title: string) => {
    if (!accounts || accounts.length === 0) return null;
    
    return (
      <div>
        <h4 className="font-semibold mb-3 text-foreground">{title}</h4>
        <div className="space-y-2">
          {accounts.map((acc, idx) => (
            <div 
              key={idx} 
              className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
            >
              <span className="text-sm font-medium text-foreground">
                {acc.accountCode} - {acc.accountName}
              </span>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={acc.isBalanced ? 'default' : 'destructive'}
                  className="font-mono"
                >
                  {acc.totalDebit.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                </Badge>
                {acc.isBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasAnyData = 
    metadata.class1_FixedAssets?.length ||
    metadata.class2_CurrentAssets?.length ||
    metadata.class3_Inventory?.length ||
    metadata.class4_ThirdParties?.length ||
    metadata.class5_Treasury?.length ||
    metadata.class6_Expenses?.length ||
    metadata.class7_Revenue?.length;

  if (!hasAnyData && !metadata.anomalies?.length) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Detalii Complete Balanță
        </CardTitle>
      </CardHeader>
      <CardContent>
        {metadata.anomalies && metadata.anomalies.length > 0 && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Anomalii Detectate:
            </h4>
            <div className="space-y-2">
              {metadata.anomalies.map((anomaly: string, idx: number) => (
                <p key={idx} className="text-sm text-destructive/90">{anomaly}</p>
              ))}
            </div>
          </div>
        )}
        
        <Tabs defaultValue="treasury" className="w-full">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="treasury">Trezorerie</TabsTrigger>
            <TabsTrigger value="clients">Clienți/Furnizori</TabsTrigger>
            <TabsTrigger value="assets">Active</TabsTrigger>
            <TabsTrigger value="stocks">Stocuri</TabsTrigger>
            <TabsTrigger value="expenses">Cheltuieli</TabsTrigger>
            <TabsTrigger value="revenue">Venituri</TabsTrigger>
            <TabsTrigger value="all">Toate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="treasury" className="mt-4">
            {renderAccountList(metadata.class5_Treasury, "Clasa 5 - Conturi de Trezorerie")}
          </TabsContent>
          
          <TabsContent value="clients" className="mt-4">
            {renderAccountList(
              metadata.class4_ThirdParties?.filter((a: AccountBalance) => 
                a.accountCode.startsWith('411') || a.accountCode.startsWith('401')
              ),
              "Clasa 4 - Clienți și Furnizori"
            )}
          </TabsContent>
          
          <TabsContent value="assets" className="mt-4">
            {renderAccountList(metadata.class1_FixedAssets, "Clasa 1 - Imobilizări")}
          </TabsContent>
          
          <TabsContent value="stocks" className="mt-4">
            {renderAccountList(metadata.class2_CurrentAssets, "Clasa 2 - Stocuri")}
            {renderAccountList(metadata.class3_Inventory, "Clasa 3 - Cheltuieli în Avans", "mt-4")}
          </TabsContent>
          
          <TabsContent value="expenses" className="mt-4">
            {renderActivityList(metadata.class6_Expenses, "Clasa 6 - Cheltuieli")}
          </TabsContent>
          
          <TabsContent value="revenue" className="mt-4">
            {renderActivityList(metadata.class7_Revenue, "Clasa 7 - Venituri")}
          </TabsContent>
          
          <TabsContent value="all" className="mt-4 space-y-6">
            {renderAccountList(metadata.class1_FixedAssets, "Clasa 1 - Imobilizări")}
            {renderAccountList(metadata.class2_CurrentAssets, "Clasa 2 - Stocuri")}
            {renderAccountList(metadata.class3_Inventory, "Clasa 3 - Cheltuieli în Avans")}
            {renderAccountList(metadata.class4_ThirdParties, "Clasa 4 - Terți")}
            {renderAccountList(metadata.class5_Treasury, "Clasa 5 - Trezorerie")}
            {renderActivityList(metadata.class6_Expenses, "Clasa 6 - Cheltuieli")}
            {renderActivityList(metadata.class7_Revenue, "Clasa 7 - Venituri")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
