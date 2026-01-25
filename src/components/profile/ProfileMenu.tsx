import { useState } from 'react';
import { User, Key, MapPin, LogOut, Users, Building2, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocationsModal } from './LocationsModal';

import { ProfileSettingsModal } from './ProfileSettingsModal';
import { useClinic } from '@/contexts/ClinicContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProfileMenuProps {
  className?: string;
}

export function ProfileMenu({ className }: ProfileMenuProps) {
  const [locationsOpen, setLocationsOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const { isAdmin, clinicName, displayName } = useClinic();
  const { setIsOnboardingOpen, isCompleted, progress } = useOnboarding();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Erro ao sair');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn("flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-colors", className)}>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{displayName || 'Usuário'}</p>
              <p className="text-xs opacity-80">{clinicName || 'Minha Clínica'}</p>
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setProfileOpen(true)}
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span>Minha Clínica</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Key className="mr-2 h-4 w-4" />
            <span>Alterar Senha</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setLocationsOpen(true)}
          >
            <MapPin className="mr-2 h-4 w-4" />
            <span>Gerenciar Locais</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Onboarding / Setup option */}
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setIsOnboardingOpen(true)}
          >
            <Sparkles className="mr-2 h-4 w-4 text-[#a03f3d]" />
            <span className="flex-1">Configuração inicial</span>
            {!isCompleted && (
              <span className="text-xs font-medium text-[#a03f3d] bg-red-50 px-1.5 py-0.5 rounded">
                {Math.round(progress)}%
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LocationsModal open={locationsOpen} onOpenChange={setLocationsOpen} />

      <ProfileSettingsModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}







