import { useState, useEffect } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('sports-intel-settings');
    // Por defecto: local, sin ocultar resultados, autorefresh activado
    return saved ? JSON.parse(saved) : { timeZone: 'local', hideResults: false, autoRefresh: true };
  });

  useEffect(() => {
    localStorage.setItem('sports-intel-settings', JSON.stringify(settings));
  }, [settings]);

  const setTimeZone = (zone: string) => {
    setSettings((s: any) => ({ ...s, timeZone: zone }));
    setTimeout(() => window.location.reload(), 200); // Recarga para aplicar la hora
  };
  
  const toggleHideResults = () => setSettings((s: any) => ({ ...s, hideResults: !s.hideResults }));
  const toggleAutoRefresh = () => setSettings((s: any) => ({ ...s, autoRefresh: !s.autoRefresh }));

  return { settings, setTimeZone, toggleHideResults, toggleAutoRefresh };
}