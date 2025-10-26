import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface AcademicTooltipProps {
  metric: string;
  theory: string;
  study: string;
  citation: string;
  doi?: string;
}

export function AcademicTooltip({ 
  metric, 
  theory, 
  study, 
  citation, 
  doi 
}: AcademicTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5" aria-label="Informații ajutător academic">
            <Info className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm" side="right">
          <div className="space-y-2">
            <p className="font-semibold text-sm">{metric}</p>
            <p className="text-xs">
              <span className="font-medium">Teorie:</span> {theory}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Bază academică:</span> {study}
            </p>
            <p className="text-xs italic border-l-2 border-primary pl-2 mt-2">
              "{citation}"
            </p>
            {doi && (
              <a 
                href={`https://doi.org/${doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline block mt-2"
              >
                📄 Vezi studiul complet →
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
