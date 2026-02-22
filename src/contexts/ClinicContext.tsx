import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type Role = 'admin' | 'dentist' | 'assistant' | 'editor' | 'viewer';

interface ClinicMember {
    id: string;
    user_id: string;
    email: string;
    role: Role;
    roles: Role[];
    created_at: string;
}

interface ClinicUserRow {
    clinic_id: string;
    role: string;
    roles: string[] | null;
    clinics: { name: string } | null;
}

interface ClinicContextType {
    clinicId: string | null;
    clinicName: string | null;
    userName: string | null;
    displayName: string | null;
    gender: 'male' | 'female' | null;
    role: Role | null;
    roles: Role[];
    isAdmin: boolean;
    isDentist: boolean;
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
    const [roles, setRoles] = useState<Role[]>([]);
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

            // Get user's clinic and role (prioritize admin role if user has multiple clinics)
            const { data: clinicUsers } = await supabase
                .from('clinic_users')
                .select(`
          clinic_id,
          role,
          roles,
          clinics (name)
        `)
                .eq('user_id', user.id)
                .order('role', { ascending: true }); // 'admin' comes before 'dentist' alphabetically

            // Get the first clinic (preferring admin role)
            const clinicUsersList = clinicUsers as unknown as ClinicUserRow[] | null;
            const typedClinicUser = clinicUsersList && clinicUsersList.length > 0
                ? (clinicUsersList.find(cu => {
                    const r = cu.roles || [cu.role];
                    return r.includes('admin');
                }) || clinicUsersList[0])
                : null;

            if (typedClinicUser) {
                setClinicId(typedClinicUser.clinic_id);
                setClinicName(typedClinicUser.clinics?.name || null);
                const userRoles = (typedClinicUser.roles || [typedClinicUser.role]) as Role[];
                setRole(typedClinicUser.role as Role);
                setRoles(userRoles);

                // If admin, also fetch all members
                if (userRoles.includes('admin')) {
                    const { data: membersData } = await supabase
                        .from('clinic_users')
                        .select('id, user_id, role, roles, created_at')
                        .eq('clinic_id', typedClinicUser.clinic_id);

                    if (membersData) {
                        setMembers((membersData as any[]).map(m => ({
                            ...m,
                            roles: m.roles || [m.role],
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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            // Only refetch on meaningful auth changes (login/logout).
            // Ignore TOKEN_REFRESHED and INITIAL_SESSION to avoid unnecessary
            // re-renders that can disrupt open modals and forms.
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                fetchClinicData();
            }
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
        roles,
        isAdmin: roles.includes('admin'),
        isDentist: roles.some(r => ['admin', 'dentist'].includes(r)),
        canEdit: roles.some(r => ['admin', 'editor', 'dentist'].includes(r)),
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
