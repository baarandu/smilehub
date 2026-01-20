import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ClinicProvider } from "@/contexts/ClinicContext";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy loading content pages
const Index = lazy(() => import("./pages/Index"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Materials = lazy(() => import("./pages/Materials"));
const Financial = lazy(() => import("./pages/Financial"));
const FinancialSettings = lazy(() => import("./pages/FinancialSettings"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminPlans = lazy(() => import("./pages/AdminPlans"));
const Pricing = lazy(() => import("./pages/Pricing"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="flex min-h-screen bg-background w-full">
    {/* Sidebar Skeleton (hidden on mobile) */}
    <div className="hidden md:block w-64 border-r border-border p-4 space-y-4">
      <Skeleton className="h-8 w-3/4 mb-8" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>

    {/* Main Content Skeleton */}
    <div className="flex-1 p-4 md:p-8 space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>

      {/* Table/List Skeleton */}
      <div className="space-y-4 mt-8">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  </div>
);

const AppContent = () => (
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      {/* Auth routes (no layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<AppLayout><Index /></AppLayout>} />
        <Route path="/pacientes" element={<AppLayout><Patients /></AppLayout>} />
        <Route path="/pacientes/:id" element={<AppLayout><PatientDetail /></AppLayout>} />
        <Route path="/agenda" element={<AppLayout><Agenda /></AppLayout>} />
        <Route path="/alertas" element={<AppLayout><Alerts /></AppLayout>} />
        <Route path="/materiais" element={<AppLayout><Materials /></AppLayout>} />
        <Route path="/financeiro" element={<AppLayout><Financial /></AppLayout>} />
        <Route path="/financeiro/configuracoes" element={<AppLayout><FinancialSettings /></AppLayout>} />
        <Route path="/financeiro" element={<AppLayout><Financial /></AppLayout>} />
        <Route path="/financeiro/configuracoes" element={<AppLayout><FinancialSettings /></AppLayout>} />
        <Route path="/planos" element={<AppLayout><Pricing /></AppLayout>} />
      </Route>

      {/* Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/planos" element={<AppLayout><AdminPlans /></AppLayout>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense >
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ClinicProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ClinicProvider>
  </QueryClientProvider>
);

export default App;


