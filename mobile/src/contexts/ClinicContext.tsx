import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getSelectedClinicId, setSelectedClinicId } from '../lib/selectedClinic';
import { useAuth } from './AuthContext';

type Role = 'admin' | 'dentist' | 'assistant' | 'editor' | 'viewer';

interface ClinicMember {
    id: string;
    user_id: string;
    email: string;
    role: Role;
    roles: Role[];
    created_at: string;
}

export interface AvailableClinic {
    id: string;
    name: string;
    role: string;
    roles: string[];
}

interface ClinicContextType {
    clinicId: string | undefined;
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
    availableClinics: AvailableClinic[];
    switchClinic: (clinicId: string) => Promise<void>;
    refetch: () => Promise<void>;
}

interface ClinicUserRow {
    clinic_id: string;
    role: string;
    roles: string[] | null;
    clinics: { name: string } | null;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
    const { refreshSubscription } = useAuth();
    const [clinicId, setClinicId] = useState<string | undefined>(undefined);
    const [clinicName, setClinicName] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [gender, setGender] = useState<'male' | 'female' | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [members, setMembers] = useState<ClinicMember[]>([]);
    const [availableClinics, setAvailableClinics] = useState<AvailableClinic[]>([]);
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

            const clinicUsersList = clinicUsers as unknown as ClinicUserRow[] | null;

            // Expose all clinics user belongs to (for the clinic switcher UI)
            setAvailableClinics(
                (clinicUsersList || []).map(cu => ({
                    id: cu.clinic_id,
                    name: cu.clinics?.name || 'Clínica sem nome',
                    role: cu.role,
                    roles: cu.roles || [cu.role],
                }))
            );

            // Selection precedence: AsyncStorage selected_clinic_id → admin role → first row
            const savedClinicId = await getSelectedClinicId();
            const typedClinicUser = clinicUsersList && clinicUsersList.length > 0
                ? (clinicUsersList.find(cu => savedClinicId && cu.clinic_id === savedClinicId)
                    || clinicUsersList.find(cu => {
                        const r = cu.roles || [cu.role];
                        return r.includes('admin');
                    })
                    || clinicUsersList[0])
                : null;

            if (typedClinicUser) {
                setClinicId(typedClinicUser.clinic_id);
                setClinicName(typedClinicUser.clinics?.name || null);
                const userRoles = (typedClinicUser.roles || [typedClinicUser.role]) as Role[];
                setRole(typedClinicUser.role as Role);
                setRoles(userRoles);

                // Display name: secretária-só (assistant/viewer) sem Dr./Dra.,
                // demais com prefixo conforme gênero.
                if (fullName) {
                    const isSecretaryOnly = userRoles.length > 0
                        && userRoles.every(r => r === 'assistant' || r === 'viewer');
                    if (isSecretaryOnly) {
                        setDisplayName(fullName);
                    } else {
                        const prefix = userGender === 'female' ? 'Dra.' : 'Dr.';
                        setDisplayName(`${prefix} ${fullName}`);
                    }
                } else {
                    setDisplayName(null);
                }

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
            } else {
                setDisplayName(fullName);
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

    const switchClinic = async (newClinicId: string) => {
        if (newClinicId === clinicId) return;
        await setSelectedClinicId(newClinicId);
        await Promise.all([fetchClinicData(), refreshSubscription()]);
    };

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
        availableClinics,
        switchClinic,
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
