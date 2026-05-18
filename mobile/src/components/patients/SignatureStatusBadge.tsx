import React from 'react';
import { View, Text } from 'react-native';
import type { SignatureStatus, SignatoryStatus } from '../../types/digitalSignature';

interface StatusStyle {
  label: string;
  bg: string;
  fg: string;
  border: string;
}

const STATUS_CONFIG: Record<SignatureStatus, StatusStyle> = {
  PENDING_UPLOAD: { label: 'Preparando', bg: '#F3F4F6', fg: '#374151', border: '#E5E7EB' },
  DRAFT: { label: 'Rascunho', bg: '#F3F4F6', fg: '#374151', border: '#E5E7EB' },
  PROCESSING: { label: 'Processando', bg: '#FEF3C7', fg: '#92400E', border: '#FDE68A' },
  SENT: { label: 'Aguardando', bg: '#DBEAFE', fg: '#1E40AF', border: '#BFDBFE' },
  SEALING: { label: 'Finalizando', bg: '#DBEAFE', fg: '#1E40AF', border: '#BFDBFE' },
  COMPLETED: { label: 'Assinado', bg: '#DCFCE7', fg: '#166534', border: '#BBF7D0' },
  EXPIRED: { label: 'Expirado', bg: '#FEE2E2', fg: '#991B1B', border: '#FECACA' },
  VOIDED: { label: 'Cancelado', bg: '#FEE2E2', fg: '#991B1B', border: '#FECACA' },
  ERROR: { label: 'Erro', bg: '#FEE2E2', fg: '#991B1B', border: '#FECACA' },
};

const SIGNATORY_STATUS_CONFIG: Record<SignatoryStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: '#6B7280' },
  WAITING_TURN: { label: 'Aguardando vez', color: '#D97706' },
  VIEWED: { label: 'Visualizado', color: '#2563EB' },
  SIGNED: { label: 'Assinado', color: '#059669' },
  REJECTED: { label: 'Rejeitado', color: '#DC2626' },
};

interface SignatureStatusBadgeProps {
  status: SignatureStatus;
}

export function SignatureStatusBadge({ status }: SignatureStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.ERROR;

  return (
    <View
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
      }}
    >
      <Text style={{ color: config.fg, fontSize: 11, fontWeight: '600' }}>{config.label}</Text>
    </View>
  );
}

interface SignatoryStatusLabelProps {
  status: SignatoryStatus | null;
  label: string;
}

export function SignatoryStatusLabel({ status, label }: SignatoryStatusLabelProps) {
  if (!status) return null;
  const config = SIGNATORY_STATUS_CONFIG[status] || SIGNATORY_STATUS_CONFIG.PENDING;

  return (
    <Text style={{ fontSize: 11, color: config.color }}>
      {label}: {config.label}
    </Text>
  );
}
