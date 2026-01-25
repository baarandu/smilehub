import { useState, useEffect, ReactNode } from 'react';
import { X, Lightbulb, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface OnboardingTooltipProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showOnce?: boolean;
  stepId?: string; // Links to onboarding step
  actionLabel?: string;
  onAction?: () => void;
}

export function OnboardingTooltip({
  id,
  title,
  description,
  children,
  position = 'bottom',
  showOnce = true,
  stepId,
  actionLabel,
  onAction,
}: OnboardingTooltipProps) {
  const { showTooltips } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const storageKey = `tooltip_dismissed_${id}`;

  useEffect(() => {
    if (showOnce) {
      const dismissed = localStorage.getItem(storageKey);
      if (dismissed) {
        setIsDismissed(true);
      }
    }
  }, [storageKey, showOnce]);

  useEffect(() => {
    if (showTooltips && !isDismissed) {
      // Small delay before showing tooltip
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [showTooltips, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    if (showOnce) {
      localStorage.setItem(storageKey, 'true');
    }
  };

  const handleAction = () => {
    handleDismiss();
    onAction?.();
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-white border-x-transparent border-b-transparent',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-white border-x-transparent border-t-transparent',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-white border-y-transparent border-r-transparent',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-white border-y-transparent border-l-transparent',
  };

  return (
    <div className="relative inline-block">
      {children}

      {isVisible && (
        <div
          className={cn(
            'absolute z-50 w-72 animate-in fade-in-0 zoom-in-95 duration-200',
            positionClasses[position]
          )}
        >
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-0 h-0 border-[8px]',
              arrowClasses[position]
            )}
          />

          {/* Content */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
              </div>
              <button
                onClick={handleDismiss}
                className="shrink-0 p-1 hover:bg-amber-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>

              {actionLabel && onAction && (
                <button
                  onClick={handleAction}
                  className="flex items-center gap-1 text-sm font-medium text-[#a03f3d] hover:text-[#8b3634] transition-colors"
                >
                  {actionLabel}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Spotlight component for highlighting elements
interface SpotlightProps {
  active: boolean;
  children: ReactNode;
  pulse?: boolean;
}

export function OnboardingSpotlight({ active, children, pulse = true }: SpotlightProps) {
  if (!active) return <>{children}</>;

  return (
    <div className="relative">
      {/* Pulsing ring */}
      {pulse && (
        <div className="absolute -inset-2 rounded-xl bg-[#a03f3d]/10 animate-pulse" />
      )}
      {/* Border highlight */}
      <div className="relative ring-2 ring-[#a03f3d] ring-offset-2 rounded-xl">
        {children}
      </div>
    </div>
  );
}

// Simple info tooltip for explaining fields
interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className="text-xs font-medium">?</span>
      </button>

      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            {text}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-[6px] border-gray-900 border-x-transparent border-b-transparent" />
        </div>
      )}
    </div>
  );
}
