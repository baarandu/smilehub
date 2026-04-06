import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
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

interface ClinicOption {
    clinic_id: string;
    clinic_name: string;
    role: string;
    roles: Role[];
}

interface ClinicContextType {
    clinicId: string | null;
    clinicName: string | null;
    userName: string | null;
    displayName: string | null;
    gender: 'male' | 'female' | null;
    role: Role | null;
    roles: Role[];
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isDentist: boolean;
    canEdit: boolean;
    loading: boolean;
    members: ClinicMember[];
    availableClinics: ClinicOption[];
    switchClinic: (clinicId: string) => void;
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
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [availableClinics, setAvailableClinics] = useState<ClinicOption[]>([]);

    const fetchClinicData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setClinicId(null);
                setClinicName(null);
                setUserName(null);
                setDisplayName(null);
                setGender(null);
                setRole(null);
                setRoles([]);
                setMembers([]);
                setIsSuperAdmin(false);
                setLoading(false);
                return;
            }

            // Parallelize profile and clinic queries
            const [profileResult, clinicUsersResult] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('full_name, gender, is_super_admin')
                    .eq('id', user.id)
                    .single(),
                supabase
                    .from('clinic_users')
                    .select(`
              clinic_id,
              role,
              roles,
              clinics (name)
            `)
                    .eq('user_id', user.id)
                    .order('role', { ascending: true }),
            ]);

            const profile = profileResult.data;
            const clinicUsers = clinicUsersResult.data;

            const fullName = (profile as any)?.full_name || user.user_metadata?.full_name || null;
            const userGender = (profile as any)?.gender || user.user_metadata?.gender || null;
            setIsSuperAdmin(!!(profile as any)?.is_super_admin);

            setUserName(fullName);
            setGender(userGender);

            // Create display name with Dr./Dra. prefix
            if (fullName) {
                const prefix = userGender === 'female' ? 'Dra.' : 'Dr.';
                setDisplayName(`${prefix} ${fullName}`);
            } else {
                setDisplayName(null);
            }

            // Build available clinics list
            const clinicUsersList = clinicUsers as unknown as ClinicUserRow[] | null;
            const clinicOptions: ClinicOption[] = (clinicUsersList || []).map(cu => ({
                clinic_id: cu.clinic_id,
                clinic_name: cu.clinics?.name || 'Sem nome',
                role: cu.role,
                roles: (cu.roles || [cu.role]) as Role[],
            }));
            setAvailableClinics(clinicOptions);

            // Pick clinic: saved preference > admin role > first
            const savedClinicId = localStorage.getItem('selected_clinic_id');
            let typedClinicUser: ClinicUserRow | null = null;
            if (clinicUsersList && clinicUsersList.length > 0) {
                if (savedClinicId) {
                    typedClinicUser = clinicUsersList.find(cu => cu.clinic_id === savedClinicId) || null;
                }
                if (!typedClinicUser) {
                    typedClinicUser = clinicUsersList.find(cu => {
                        const r = cu.roles || [cu.role];
                        return r.includes('admin');
                    }) || clinicUsersList[0];
                }
            }

            if (typedClinicUser) {
                setClinicId(typedClinicUser.clinic_id);
                setClinicName(typedClinicUser.clinics?.name || null);
                const userRoles = (typedClinicUser.roles || [typedClinicUser.role]) as Role[];
                setRole(typedClinicUser.role as Role);
                setRoles(userRoles);

                // If admin or super admin, also fetch all members
                if (userRoles.includes('admin') || !!(profile as any)?.is_super_admin) {
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
                } else {
                    setMembers([]);
                }
            } else {
                setClinicId(null);
                setClinicName(null);
                setRole(null);
                setRoles([]);
                setMembers([]);
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

    const switchClinic = (newClinicId: string) => {
        localStorage.setItem('selected_clinic_id', newClinicId);
        fetchClinicData();
    };

    const value = useMemo<ClinicContextType>(() => ({
        clinicId,
        clinicName,
        userName,
        displayName,
        gender,
        role,
        roles,
        isSuperAdmin,
        isAdmin: isSuperAdmin || roles.includes('admin'),
        isDentist: isSuperAdmin || roles.some(r => ['admin', 'dentist'].includes(r)),
        canEdit: isSuperAdmin || roles.some(r => ['admin', 'editor', 'dentist'].includes(r)),
        loading,
        members,
        availableClinics,
        switchClinic,
        refetch: fetchClinicData,
    }), [clinicId, clinicName, userName, displayName, gender, role, roles, isSuperAdmin, loading, members, availableClinics]);

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
