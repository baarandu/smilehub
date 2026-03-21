import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Calendar, Eye, Loader2 } from 'lucide-react';

interface ConversationSummary {
  id: string;
  phone_number: string;
  contact_name: string | null;
  status: string;
  messages_count: number;
  last_message_at: string;
  appointment_created: boolean;
}

interface RecentConversationsProps {
  conversations: ConversationSummary[];
  loading: boolean;
  onLoad: () => void;
  onViewAll: () => void;
  onView: (conv: ConversationSummary) => void;
  formatDate: (dateStr: string) => string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active': return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5">Ativa</Badge>;
    case 'completed': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-1.5">Concluída</Badge>;
    case 'transferred': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5">Transferida</Badge>;
    default: return null;
  }
}

export function RecentConversations({ conversations, loading, onLoad, onViewAll, onView, formatDate }: RecentConversationsProps) {
  useEffect(() => {
    onLoad();
  }, []);

  const recent = conversations.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base">Conversas Recentes</CardTitle>
          </div>
          {conversations.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={onViewAll}>
              Ver todas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map(conv => (
              <div
                key={conv.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onView(conv)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-1.5 bg-muted rounded-full">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.contact_name || conv.phone_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conv.messages_count} msgs · {formatDate(conv.last_message_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  {conv.appointment_created && (
                    <Calendar className="w-3.5 h-3.5 text-green-600" />
                  )}
                  {getStatusBadge(conv.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
