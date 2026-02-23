import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Monitor, LogOut, ArrowLeft, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SessionManagement() {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [session, setSession] = useState<{
    email: string | undefined;
    lastSignIn: string | undefined;
    userId: string | undefined;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load session info
  if (!loaded) {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession({
          email: data.session.user.email,
          lastSignIn: data.session.user.last_sign_in_at,
          userId: data.session.user.id,
        });
      }
      setLoaded(true);
    });
  }

  const handleGlobalSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      toast.success("Todas as sessões foram encerradas");
      navigate("/login");
    } catch (error) {
      console.error("Erro ao encerrar sessões:", error);
      toast.error("Erro ao encerrar sessões. Tente novamente.");
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            Gerenciamento de Sessões
          </h1>
          <p className="text-gray-600 mt-1">
            Visualize e controle suas sessões ativas
          </p>
        </div>
      </div>

      {/* Current Session */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-5 h-5 text-green-600" />
            Sessão Atual
          </CardTitle>
          <CardDescription>Informações da sua sessão neste dispositivo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loaded && session ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">E-mail</span>
                <span className="text-sm font-medium">{session.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Último login</span>
                <span className="text-sm font-medium">
                  {session.lastSignIn
                    ? new Date(session.lastSignIn).toLocaleString("pt-BR")
                    : "Não disponível"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">ID do usuário</span>
                <span className="text-sm font-mono text-muted-foreground">
                  {session.userId?.slice(0, 8)}...
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Ativa
                </span>
              </div>
            </div>
          ) : loaded ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão ativa encontrada.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
        </CardContent>
      </Card>

      {/* Sign Out All */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Encerrar Todas as Sessões
          </CardTitle>
          <CardDescription>
            Encerra sua sessão em todos os dispositivos, incluindo este.
            Você precisará fazer login novamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={signingOut}>
                <LogOut className="w-4 h-4 mr-2" />
                {signingOut ? "Encerrando..." : "Encerrar todas as sessões"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar todas as sessões?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso vai desconectar você de todos os dispositivos, incluindo este.
                  Você será redirecionado para a página de login.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleGlobalSignOut} className="bg-red-600 hover:bg-red-700">
                  Sim, encerrar todas
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
