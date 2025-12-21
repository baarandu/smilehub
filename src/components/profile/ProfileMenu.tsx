import { useState } from 'react';
import { User, Key, MapPin, LogOut, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocationsModal } from './LocationsModal';
import { TeamManagementModal } from './TeamManagementModal';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function ProfileMenu() {
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isAdmin, clinicName, displayName } = useClinic();

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
          <button className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{displayName || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground">{clinicName || 'Minha Clínica'}</p>
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
          {isAdmin && (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setTeamOpen(true)}
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Gerenciar Equipe</span>
            </DropdownMenuItem>
          )}
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
      <TeamManagementModal open={teamOpen} onOpenChange={setTeamOpen} />
      <ProfileSettingsModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}





