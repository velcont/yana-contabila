import React from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, Sparkles } from 'lucide-react';

interface FeedbackOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export class VisualFeedback {
  static success(options: FeedbackOptions) {
    return toast.success(options.title, {
      description: options.description,
      duration: options.duration || 3000,
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: 'border-green-500/20 bg-green-500/5',
    });
  }

  static error(options: FeedbackOptions) {
    return toast.error(options.title, {
      description: options.description,
      duration: options.duration || 4000,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: 'border-red-500/20 bg-red-500/5',
    });
  }

  static warning(options: FeedbackOptions) {
    return toast.warning(options.title, {
      description: options.description,
      duration: options.duration || 3500,
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: 'border-yellow-500/20 bg-yellow-500/5',
    });
  }

  static info(options: FeedbackOptions) {
    return toast.info(options.title, {
      description: options.description,
      duration: options.duration || 3000,
      icon: <Info className="h-5 w-5 text-blue-500" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: 'border-blue-500/20 bg-blue-500/5',
    });
  }

  static loading(options: FeedbackOptions) {
    return toast.loading(options.title, {
      description: options.description,
      icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
      className: 'border-primary/20 bg-primary/5',
    });
  }

  static ai(options: FeedbackOptions) {
    return toast.success(options.title, {
      description: options.description,
      duration: options.duration || 4000,
      icon: <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: 'border-purple-500/20 bg-purple-500/5',
    });
  }

  static promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      classNames: {
        loading: 'border-primary/20 bg-primary/5',
        success: 'border-green-500/20 bg-green-500/5',
        error: 'border-red-500/20 bg-red-500/5',
      },
    });
  }
}

// Animation helpers
export const createSuccessAnimation = () => {
  const confetti = document.createElement('div');
  confetti.className = 'fixed inset-0 pointer-events-none z-[9999]';
  confetti.innerHTML = `
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="animate-ping absolute h-32 w-32 rounded-full bg-green-500/20"></div>
      <div class="animate-pulse absolute h-24 w-24 rounded-full bg-green-500/30"></div>
    </div>
  `;
  document.body.appendChild(confetti);
  setTimeout(() => confetti.remove(), 1000);
};

export const createErrorAnimation = () => {
  const shake = document.createElement('style');
  shake.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
  `;
  document.head.appendChild(shake);
  setTimeout(() => shake.remove(), 500);
};
