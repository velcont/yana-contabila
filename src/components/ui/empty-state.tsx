import { ReactNode } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      {icon && (
        <div className="mb-4 text-muted-foreground opacity-50 animate-in fade-in-50 zoom-in-95 duration-300">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2 animate-in fade-in-50 slide-in-from-bottom-2 duration-300 delay-75">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground max-w-md mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300 delay-150">
          {description}
        </p>
      )}
      <div className="flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 duration-300 delay-200">
        {action && (
          <Button onClick={action.onClick} variant={action.variant || "default"}>
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant="outline">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
