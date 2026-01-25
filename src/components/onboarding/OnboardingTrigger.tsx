import { Settings, HelpCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function OnboardingHelpMenu() {
  const { setIsOnboardingOpen, resetOnboarding, isCompleted, progress } = useOnboarding();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
          {!isCompleted && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#a03f3d] rounded-full border-2 border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => setIsOnboardingOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          <div className="flex-1">
            <span>Configuração inicial</span>
            {!isCompleted && (
              <span className="ml-2 text-xs text-[#a03f3d]">{Math.round(progress)}%</span>
            )}
          </div>
        </DropdownMenuItem>
        {isCompleted && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetOnboarding}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refazer configuração
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
