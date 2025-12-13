import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Agenda from "./pages/Agenda";
import Alerts from "./pages/Alerts";
import Materials from "./pages/Materials";
import Financial from "./pages/Financial";
import FinancialSettings from "./pages/FinancialSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => (
  <AppLayout>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/pacientes" element={<Patients />} />
      <Route path="/pacientes/:id" element={<PatientDetail />} />
      <Route path="/agenda" element={<Agenda />} />
      <Route path="/alertas" element={<Alerts />} />
      <Route path="/materiais" element={<Materials />} />
      <Route path="/financeiro" element={<Financial />} />
      <Route path="/financeiro/configuracoes" element={<FinancialSettings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
