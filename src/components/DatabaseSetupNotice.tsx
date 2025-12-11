import { useState } from 'react';
import { Database, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from './ui/utils';

interface DatabaseSetupNoticeProps {
  isDark: boolean;
  onRecheck?: () => void;
}

export function DatabaseSetupNotice({ isDark, onRecheck }: DatabaseSetupNoticeProps) {
  return null;
}