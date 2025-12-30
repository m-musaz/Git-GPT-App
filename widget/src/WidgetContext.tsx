import { createContext, useContext } from 'react';
import type { AuthStatusOutput, PendingInvitesOutput } from './types';

export interface WidgetContextType {
  theme: 'light' | 'dark';
  isDark: boolean;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  openExternal: (options: { href: string }) => void;
  notifyHeight: () => void;
  setWidgetState: (state: Record<string, unknown>) => void;
  authData: AuthStatusOutput | null;
  setAuthData: (data: AuthStatusOutput | null) => void;
  invitesData: PendingInvitesOutput | null;
  setInvitesData: (data: PendingInvitesOutput | null) => void;
}

export const WidgetContext = createContext<WidgetContextType | null>(null);

export function useWidget() {
  const ctx = useContext(WidgetContext);
  if (!ctx) throw new Error('useWidget must be used within WidgetProvider');
  return ctx;
}

