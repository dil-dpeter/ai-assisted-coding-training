import React from 'react';
import { Alert, Snackbar } from '@mui/material';

interface ToastProps {
  message: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  open: boolean;
  onClose: () => void;
  autoHideDuration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  severity = 'warning',
  open,
  onClose,
  autoHideDuration = 6000,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};
