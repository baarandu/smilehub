import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { adminAuthService } from '@/services/admin/auth';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminRoute() {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        adminAuthService.isSuperAdmin().then(setIsAdmin);
    }, []);

    if (isAdmin === null) {
        return (
            <div className="flex bg-background h-screen w-full items-center justify-center p-8">
                <div className="space-y-4 w-full max-w-md">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-8 w-1/2" />
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
