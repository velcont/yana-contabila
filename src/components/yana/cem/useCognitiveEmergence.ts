import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'yana_cognitive_emergence_mode';
const ONBOARDING_KEY = 'yana_cem_onboarding_seen';

function readPref(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return true; // default ON
  return raw === '1';
}

export function useCognitiveEmergence() {
  const [enabled, setEnabled] = useState<boolean>(readPref);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_KEY) !== '1';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  }, [enabled]);

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setNeedsOnboarding(false);
  }, []);

  return {
    enabled,
    setEnabled,
    toggle: () => setEnabled((v) => !v),
    needsOnboarding: needsOnboarding && enabled,
    dismissOnboarding,
  };
}