import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClinicProvider } from "@/contexts/ClinicContext";
import Index from "./pages/Index";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Agenda from "./pages/Agenda";
import Alerts from "./pages/Alerts";
import Materials from "./pages/Materials";
import Financial from "./pages/Financial";
import FinancialSettings from "./pages/FinancialSettings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => (
  <Routes>
    {/* Auth routes (no layout) */}
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />

    {/* App routes (with layout) */}
    <Route path="/" element={<AppLayout><Index /></AppLayout>} />
    <Route path="/pacientes" element={<AppLayout><Patients /></AppLayout>} />
    <Route path="/pacientes/:id" element={<AppLayout><PatientDetail /></AppLayout>} />
    <Route path="/agenda" element={<AppLayout><Agenda /></AppLayout>} />
    <Route path="/alertas" element={<AppLayout><Alerts /></AppLayout>} />
    <Route path="/materiais" element={<AppLayout><Materials /></AppLayout>} />
    <Route path="/financeiro" element={<AppLayout><Financial /></AppLayout>} />
    <Route path="/financeiro/configuracoes" element={<AppLayout><FinancialSettings /></AppLayout>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
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


