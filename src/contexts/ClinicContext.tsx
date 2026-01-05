import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type Role = 'admin' | 'dentist' | 'assistant' | 'editor' | 'viewer';

interface ClinicMember {
    id: string;
    user_id: string;
    email: string;
    role: Role;
    created_at: string;
}

interface ClinicUserRow {
    clinic_id: string;
    role: string;
    clinics: { name: string } | null;
}

interface ClinicContextType {
    clinicId: string | null;
    clinicName: string | null;
    userName: string | null;
    displayName: string | null;
    gender: 'male' | 'female' | null;
    role: Role | null;
    isAdmin: boolean;
    canEdit: boolean;
    loading: boolean;
    members: ClinicMember[];
    refetch: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | null>(null);

export function ClinicProvider({ children }: { children: ReactNode }) {
    const [clinicId, setClinicId] = useState<string | null>(null);
    const [clinicName, setClinicName] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [gender, setGender] = useState<'male' | 'female' | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [members, setMembers] = useState<ClinicMember[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchClinicData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // Get user's profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, gender')
                .eq('id', user.id)
                .single();

            const fullName = (profile as any)?.full_name || user.user_metadata?.full_name || null;
            const userGender = (profile as any)?.gender || user.user_metadata?.gender || null;

            setUserName(fullName);
            setGender(userGender);

            // Create display name with Dr./Dra. prefix
            if (fullName) {
                const prefix = userGender === 'female' ? 'Dra.' : 'Dr.';
                setDisplayName(`${prefix} ${fullName}`);
            } else {
                setDisplayName(null);
            }

            // Get user's clinic and role
            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select(`
          clinic_id,
          role,
          clinics (name)
        `)
                .eq('user_id', user.id)
                .single();

            const typedClinicUser = clinicUser as unknown as ClinicUserRow | null;

            if (typedClinicUser) {
                setClinicId(typedClinicUser.clinic_id);
                setClinicName(typedClinicUser.clinics?.name || null);
                setRole(typedClinicUser.role as Role);

                // If admin, also fetch all members
                if (typedClinicUser.role === 'admin') {
                    const { data: membersData } = await supabase
                        .from('clinic_users')
                        .select('id, user_id, role, created_at')
                        .eq('clinic_id', typedClinicUser.clinic_id);

                    if (membersData) {
                        setMembers((membersData as any[]).map(m => ({
                            ...m,
                            email: m.user_id,
                        })) as ClinicMember[]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching clinic data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClinicData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchClinicData();
        });

        return () => subscription.unsubscribe();
    }, []);

    const value: ClinicContextType = {
        clinicId,
        clinicName,
        userName,
        displayName,
        gender,
        role,
        isAdmin: role === 'admin',
        canEdit: role === 'admin' || role === 'editor',
        loading,
        members,
        refetch: fetchClinicData,
    };

    return (
        <ClinicContext.Provider value={value}>
            {children}
        </ClinicContext.Provider>
    );
}

export function useClinic() {
    const context = useContext(ClinicContext);
    if (!context) {
        throw new Error('useClinic must be used within a ClinicProvider');
    }
    return context;
}
