import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WorkflowTooltipProps {
  children: ReactNode;
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const WorkflowTooltip = ({ children, content, side = 'top' }: WorkflowTooltipProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs bg-popover text-popover-foreground border shadow-md">
          <p className="text-xs">
            💡 <strong>Pro Tip:</strong> {content}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};