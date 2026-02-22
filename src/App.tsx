import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ClinicProvider } from "@/contexts/ClinicContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy loading content pages
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Alerts = lazy(() => import("./pages/Alerts"));
const AISecretary = lazy(() => import("./pages/AISecretary"));
const Materials = lazy(() => import("./pages/Materials"));
const Financial = lazy(() => import("./pages/Financial"));
const FinancialSettings = lazy(() => import("./pages/FinancialSettings"));
const IncomeTax = lazy(() => import("./pages/IncomeTax"));
const AccountingAgent = lazy(() => import("./pages/AccountingAgent"));
const VoiceConsultation = lazy(() => import("./pages/VoiceConsultation"));
const DentistAgent = lazy(() => import("./pages/DentistAgent"));
const ProsthesisCenter = lazy(() => import("./pages/ProsthesisCenter"));
const DashboardPreview = lazy(() => import("./pages/DashboardPreview"));
const DashboardV2 = lazy(() => import("./pages/DashboardV2"));
const LandingV2 = lazy(() => import("./pages/LandingV2"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminPlans = lazy(() => import("./pages/AdminPlans"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const Pricing = lazy(() => import("./pages/Pricing"));
const TrialExpired = lazy(() => import("./pages/TrialExpired"));
const Support = lazy(() => import("./pages/Support"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

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
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/v2" element={<LandingV2 />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Protected Routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/inicio" element={<AppLayout><Index /></AppLayout>} />
        <Route path="/suporte" element={<AppLayout><Support /></AppLayout>} />
        <Route path="/configuracoes" element={<AppLayout><Settings /></AppLayout>} />
        <Route path="/pacientes" element={<AppLayout><Patients /></AppLayout>} />
        <Route path="/pacientes/:id" element={<AppLayout><PatientDetail /></AppLayout>} />
        <Route path="/agenda" element={<AppLayout><Agenda /></AppLayout>} />
        <Route path="/alertas" element={<AppLayout><Alerts /></AppLayout>} />
        <Route path="/secretaria-ia" element={<AppLayout><AISecretary /></AppLayout>} />
        <Route path="/materiais" element={<AppLayout><Materials /></AppLayout>} />
        <Route path="/financeiro" element={<AppLayout><Financial /></AppLayout>} />
        <Route path="/financeiro/configuracoes" element={<AppLayout><FinancialSettings /></AppLayout>} />
        <Route path="/imposto-de-renda" element={<AppLayout><IncomeTax /></AppLayout>} />
        <Route path="/contabilidade-ia" element={<AppLayout><AccountingAgent /></AppLayout>} />
        <Route path="/dentista-ia" element={<AppLayout><DentistAgent /></AppLayout>} />
        <Route path="/protese" element={<AppLayout><ProsthesisCenter /></AppLayout>} />
        <Route path="/consulta-voz" element={<AppLayout><VoiceConsultation /></AppLayout>} />
        <Route path="/consulta-voz/:appointmentId" element={<AppLayout><VoiceConsultation /></AppLayout>} />
        <Route path="/dashboard-preview" element={<AppLayout><DashboardPreview /></AppLayout>} />
        <Route path="/dashboard-v2" element={<AppLayout><DashboardV2 /></AppLayout>} />
        <Route path="/planos" element={<AppLayout><Pricing /></AppLayout>} />
        <Route path="/trial-expirado" element={<TrialExpired />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/dashboard" element={<AppLayout><AdminDashboard /></AppLayout>} />
        <Route path="/admin/planos" element={<AppLayout><AdminPlans /></AppLayout>} />
        <Route path="/admin/seguranca" element={<AppLayout><SecurityDashboard /></AppLayout>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense >
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ClinicProvider>
      <OnboardingProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </OnboardingProvider>
    </ClinicProvider>
  </QueryClientProvider>
);

export default App;


