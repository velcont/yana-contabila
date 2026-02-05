import { Sparkles, X, Heart, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProactiveInitiativeCardProps {
  content: string;
  initiativeType: string;
  onDismiss: () => void;
  className?: string;
}

// Mapping pentru tipuri și stiluri
const INITIATIVE_STYLES: Record<string, {
  gradient: string;
  border: string;
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
}> = {
  self_correction_apology: {
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    border: 'border-amber-500/30',
    icon: Heart,
    title: 'YANA vrea să-ți spună ceva',
    subtitle: 'Despre conversația noastră anterioară',
  },
  thinking_about_you: {
    gradient: 'from-purple-500/10 via-pink-500/5 to-transparent',
    border: 'border-purple-500/30',
    icon: Heart,
    title: 'YANA s-a gândit la tine',
    subtitle: 'Un mesaj din suflet',
  },
  observation: {
    gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
    border: 'border-blue-500/30',
    icon: Sparkles,
    title: 'YANA a observat ceva',
    subtitle: 'Un insight pentru tine',
  },
  check_in: {
    gradient: 'from-green-500/10 via-emerald-500/5 to-transparent',
    border: 'border-green-500/30',
    icon: MessageCircle,
    title: 'YANA vrea să știe cum ești',
    subtitle: 'Mi-a fost dor de tine',
  },
  default: {
    gradient: 'from-primary/10 via-accent/5 to-transparent',
    border: 'border-primary/30',
    icon: Sparkles,
    title: 'Mesaj de la YANA',
    subtitle: 'Inițiativă proactivă',
  },
};

export function ProactiveInitiativeCard({ 
  content, 
  initiativeType, 
  onDismiss,
  className 
}: ProactiveInitiativeCardProps) {
  const style = INITIATIVE_STYLES[initiativeType] || INITIATIVE_STYLES.default;
  const Icon = style.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        "relative mx-auto max-w-3xl rounded-2xl p-4 mb-6 border shadow-lg",
        `bg-gradient-to-br ${style.gradient} ${style.border}`,
        className
      )}
    >
      {/* Animated glow effect */}
      <motion.div 
        className="absolute inset-0 rounded-2xl opacity-20"
        animate={{ 
          boxShadow: [
            '0 0 20px 0px rgba(139, 92, 246, 0.3)',
            '0 0 30px 5px rgba(139, 92, 246, 0.1)',
            '0 0 20px 0px rgba(139, 92, 246, 0.3)',
          ] 
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-muted/50 transition-colors z-10"
        aria-label="Închide"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <motion.div 
          className={cn(
            "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-primary to-accent shadow-md"
          )}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className="h-5 w-5 text-white" />
        </motion.div>
        <div>
          <span className="text-sm font-semibold text-foreground">
            {style.title}
          </span>
          <span className="block text-xs text-muted-foreground">
            {style.subtitle}
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pl-[52px]">
        {content}
      </p>

      {/* Action hint */}
      <div className="mt-4 pl-[52px] flex items-center gap-2">
        <motion.span 
          className="text-xs text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          💬 Poți răspunde direct în chat dacă vrei să continuăm discuția.
        </motion.span>
      </div>
    </motion.div>
  );
}
