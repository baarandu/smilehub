import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

const PING_INTERVAL_MS = 5 * 60 * 1000;
// Levemente menor que o intervalo para o setInterval nao ser pulado por jitter
const THROTTLE_MS = PING_INTERVAL_MS - 30 * 1000;

// Modulo-level: sobrevive a remount do AppLayout a cada navegacao
let lastPingAt = 0;

async function ping() {
    const now = Date.now();
    if (now - lastPingAt < THROTTLE_MS) return;
    lastPingAt = now;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            lastPingAt = 0;
            return;
        }

        const { error } = await supabase.rpc('record_heartbeat');
        if (error) {
            logger.error('Heartbeat failed:', error);
            lastPingAt = 0;
        }
    } catch (err) {
        logger.error('Heartbeat failed:', err);
        lastPingAt = 0;
    }
}

/**
 * Registra que o usuario esta usando a aplicacao (mesmo sem editar nada),
 * alimentando as metricas de atividade do painel admin.
 */
export function useHeartbeat() {
    useEffect(() => {
        ping();

        const interval = setInterval(ping, PING_INTERVAL_MS);
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') ping();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);
}
