import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
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
const DentistAgent = lazy(() => import("./pages/DentistAgent"));
const ProsthesisCenter = lazy(() => import("./pages/ProsthesisCenter"));
const Ortodontia = lazy(() => import("./pages/Ortodontia"));
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
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const DPA = lazy(() => import("./pages/DPA"));
const InformationSecurityPolicy = lazy(() => import("./pages/InformationSecurityPolicy"));
const LGPDRiskMatrix = lazy(() => import("./pages/LGPDRiskMatrix"));
const ComplianceChecklist = lazy(() => import("./pages/ComplianceChecklist"));
const RIPD = lazy(() => import("./pages/RIPD"));
const SessionManagement = lazy(() => import("./pages/SessionManagement"));
const BatchSignature = lazy(() => import("./pages/BatchSignature"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
        toast.error('Erro inesperado. Tente novamente.');
      },
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
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacidade" element={<PrivacyPolicy />} />
      <Route path="/termos" element={<TermsOfService />} />
      <Route path="/dpa" element={<DPA />} />
      <Route path="/seguranca-informacao" element={<InformationSecurityPolicy />} />
      {/* Protected Routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/inicio" element={<AppLayout><Index /></AppLayout>} />
        <Route path="/suporte" element={<AppLayout><Support /></AppLayout>} />
        <Route path="/configuracoes" element={<AppLayout><Settings /></AppLayout>} />
        <Route path="/configuracoes/sessoes" element={<AppLayout><SessionManagement /></AppLayout>} />
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
        <Route path="/ortodontia" element={<AppLayout><Ortodontia /></AppLayout>} />
        <Route path="/planos" element={<AppLayout><Pricing /></AppLayout>} />
        <Route path="/configuracoes/matriz-risco" element={<AppLayout><LGPDRiskMatrix /></AppLayout>} />
        <Route path="/configuracoes/compliance" element={<AppLayout><ComplianceChecklist /></AppLayout>} />
        <Route path="/configuracoes/ripd" element={<AppLayout><RIPD /></AppLayout>} />
        <Route path="/assinaturas" element={<AppLayout><BatchSignature /></AppLayout>} />
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


