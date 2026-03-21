import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Settings, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { scheduleSettingsService, type ScheduleSetting } from '@/services/scheduleSettings';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const formatTime = (time: string) => time?.slice(0, 5) || time;

interface ScheduleOverviewProps {
  clinicId: string | null;
}

interface DentistSchedule {
  dentist: { id: string; name: string };
  settings: ScheduleSetting[];
}

export function ScheduleOverview({ clinicId }: ScheduleOverviewProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dentistSchedules, setDentistSchedules] = useState<DentistSchedule[]>([]);

  useEffect(() => {
    if (!clinicId) return;
    loadSchedules();
  }, [clinicId]);

  const loadSchedules = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [dentists, allSettings] = await Promise.all([
        scheduleSettingsService.getDentists(clinicId),
        scheduleSettingsService.getByClinic(clinicId),
      ]);

      const grouped: DentistSchedule[] = dentists.map(dentist => ({
        dentist,
        settings: allSettings.filter(s => s.professional_id === dentist.id && s.is_active),
      }));

      setDentistSchedules(grouped);
    } catch (e) {
      console.warn('Error loading schedules:', e);
    } finally {
      setLoading(false);
    }
  };

  const goToAgenda = () => {
    navigate('/agenda?openSettings=true');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (dentistSchedules.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base">Horários e Disponibilidade</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Clock className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Nenhum horário configurado</p>
            <Button variant="outline" onClick={goToAgenda}>
              <Settings className="w-4 h-4 mr-2" />
              Configurar Horários de Atendimento
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base">Horários e Disponibilidade</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={goToAgenda}>
            <Settings className="w-3.5 h-3.5" />
            Configurar Horários de Atendimento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {dentistSchedules.map(({ dentist, settings }) => {
            // Group by day
            const byDay: Record<number, ScheduleSetting[]> = {};
            settings.forEach(s => {
              if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
              byDay[s.day_of_week].push(s);
            });

            const activeDays = Object.keys(byDay).map(Number).sort();
            const daysSummary = activeDays.length > 0
              ? activeDays.map(d => DAY_NAMES_SHORT[d]).join(', ')
              : 'Sem horários';

            return (
              <div key={dentist.id}>
                {/* Professional header */}
                {dentistSchedules.length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{dentist.name}</span>
                  </div>
                )}

                {settings.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic ml-6">Sem horários configurados</p>
                ) : (
                  <div className="space-y-1.5">
                    {[1, 2, 3, 4, 5, 6, 0].map(day => {
                      const slots = byDay[day];
                      if (!slots || slots.length === 0) return null;

                      return (
                        <div key={day} className="flex items-center gap-3 bg-muted/40 px-3 py-2 rounded-lg">
                          <span className="text-xs font-medium text-muted-foreground w-16">{DAY_NAMES_SHORT[day]}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {slots.map((slot, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs font-normal">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                {slot.interval_minutes !== 30 && (
                                  <span className="text-muted-foreground ml-1">({slot.interval_minutes}min)</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
