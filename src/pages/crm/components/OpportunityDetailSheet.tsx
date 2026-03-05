import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, MessageCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';
import { crmMetricsService, type OpportunityCard, type OpportunityDetailRow, type CrmMetricsPeriod } from '@/services/crmMetrics';
import { formatCurrency, getWhatsAppNumber } from '@/utils/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OpportunityDetailSheetProps {
  card: OpportunityCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period?: CrmMetricsPeriod;
}

export function OpportunityDetailSheet({ card, open, onOpenChange, period }: OpportunityDetailSheetProps) {
  const { clinicId } = useClinic();
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['crm-opportunity-detail', clinicId, card?.key, period?.start, period?.end],
    queryFn: () => crmMetricsService.getCardDetail(clinicId!, card!.key, period),
    enabled: !!clinicId && !!card && open,
  });

  if (!card) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const handleNavigatePatient = (patientId?: string) => {
    if (!patientId) return;
    onOpenChange(false);
    navigate(`/pacientes/${patientId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
            {card.title}
          </SheetTitle>
          <SheetDescription>
            {card.count} {card.count === 1 ? 'resultado' : 'resultados'}
            {card.value > 0 && ` — ${formatCurrency(card.value)}`}
            {' | '}{card.period}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado</p>
          ) : (
            rows.map(row => (
              <div
                key={row.id}
                className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <button
                      className="font-medium text-sm text-foreground hover:text-primary hover:underline text-left"
                      onClick={() => handleNavigatePatient(row.patient_id)}
                    >
                      {row.patient_name}
                    </button>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      {row.date && (
                        <span className="text-xs text-muted-foreground">{formatDate(row.date)}</span>
                      )}
                      {row.extra && (
                        <span className="text-xs text-muted-foreground">{row.extra}</span>
                      )}
                    </div>
                    {row.value != null && row.value > 0 && (
                      <p className="text-sm font-semibold mt-1" style={{ color: card.color }}>
                        {formatCurrency(row.value)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {row.phone && (
                      <>
                        <a
                          href={`https://wa.me/${getWhatsAppNumber(row.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </a>
                        <a href={`tel:${row.phone}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Phone className="w-4 h-4" />
                          </Button>
                        </a>
                      </>
                    )}
                    {row.patient_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleNavigatePatient(row.patient_id)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
