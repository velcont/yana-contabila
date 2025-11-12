import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface Conflict {
  field: string;
  reason: string;
  old_value?: any;
  new_value?: any;
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: Conflict[];
  validationNotes?: string;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflicts,
  validationNotes
}: ConflictResolutionDialogProps) {
  
  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('ro-RO', {
        style: 'currency',
        currency: 'RON',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <DialogTitle>Conflicte Detectate în Date</DialogTitle>
              <DialogDescription>
                Validatorul AI a detectat inconsistențe în datele furnizate
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Validation Notes */}
          {validationNotes && (
            <Card className="p-4 border-warning/20 bg-warning/5">
              <p className="text-sm text-muted-foreground italic">
                {validationNotes}
              </p>
            </Card>
          )}

          {/* Conflicts List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Conflicte Identificate ({conflicts.length})
            </h4>
            
            {conflicts.map((conflict, idx) => (
              <Card key={idx} className="p-4 border-l-4 border-l-warning">
                <div className="space-y-3">
                  {/* Field Name */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs">
                      {conflict.field}
                    </Badge>
                  </div>

                  {/* Reason */}
                  <p className="text-sm text-muted-foreground">
                    {conflict.reason}
                  </p>

                  {/* Values Comparison */}
                  {(conflict.old_value !== undefined || conflict.new_value !== undefined) && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {conflict.old_value !== undefined && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            Valoare Anterioară
                          </span>
                          <div className="p-2 rounded-md bg-muted/50 text-sm font-mono">
                            {formatValue(conflict.old_value)}
                          </div>
                        </div>
                      )}
                      {conflict.new_value !== undefined && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            Valoare Nouă
                          </span>
                          <div className="p-2 rounded-md bg-primary/10 text-sm font-mono">
                            {formatValue(conflict.new_value)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Recommendation */}
          <Card className="p-4 border-success/20 bg-success/5">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-sm text-success">
                  Recomandare
                </h4>
                <p className="text-sm text-muted-foreground">
                  Pentru a continua cu generarea strategiei, clarifică datele în conflict 
                  în următorul mesaj către Yana Strategică. Oferă detalii clare despre care 
                  valoare este corectă și contextul acesteia.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Am Înțeles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
