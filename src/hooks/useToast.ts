import { useState, useCallback } from 'react';

// Hook for using toast functionality
export function useToast() {
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity?: 'error' | 'warning' | 'info' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'warning',
  });

  const showToast = useCallback(
    (message: string, severity: 'error' | 'warning' | 'info' | 'success' = 'warning') => {
      setToast({
        open: true,
        message,
        severity,
      });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      open: false,
    }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
}
