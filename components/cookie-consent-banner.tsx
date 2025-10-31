'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CookieConsent } from '@/lib/security/gdpr';
import { getDefaultCookieConsent, validateCookieConsent } from '@/lib/security/gdpr';

const COOKIE_CONSENT_KEY = 'cookie-consent';
const COOKIE_CONSENT_VERSION = '1.0';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>(getDefaultCookieConsent());

  useEffect(() => {
    // Check if user has already given consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);

    if (!savedConsent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        if (parsed.version === COOKIE_CONSENT_VERSION) {
          setConsent(validateCookieConsent(parsed.consent));
        } else {
          // Version mismatch, show banner again
          setShowBanner(true);
        }
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  const saveConsent = (newConsent: CookieConsent) => {
    const consentData = {
      version: COOKIE_CONSENT_VERSION,
      consent: newConsent,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    setConsent(newConsent);
    setShowBanner(false);
    setShowSettings(false);

    // Trigger consent event for analytics
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cookie-consent-changed', { detail: newConsent })
      );
    }
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  };

  const acceptNecessary = () => {
    saveConsent(getDefaultCookieConsent());
  };

  const handleCustomConsent = () => {
    saveConsent(consent);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
        <Card className="mx-auto max-w-4xl border-2 bg-background p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-semibold">
                🍪 Utilizamos cookies
              </h3>
              <p className="text-sm text-muted-foreground">
                Utilizamos cookies para mejorar tu experiencia, analizar el tráfico del sitio
                y personalizar el contenido. Puedes aceptar todas las cookies o configurar
                tus preferencias.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setShowSettings(true)}
                className="whitespace-nowrap"
              >
                Configurar
              </Button>
              <Button
                variant="outline"
                onClick={acceptNecessary}
                className="whitespace-nowrap"
              >
                Solo necesarias
              </Button>
              <Button
                onClick={acceptAll}
                className="whitespace-nowrap"
              >
                Aceptar todas
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuración de cookies</DialogTitle>
            <DialogDescription>
              Gestiona tus preferencias de cookies. Las cookies necesarias siempre están
              activas para el correcto funcionamiento del sitio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="necessary"
                checked={true}
                disabled
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="necessary" className="text-base font-semibold">
                  Cookies necesarias (requeridas)
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Estas cookies son esenciales para el funcionamiento del sitio web y no
                  pueden ser desactivadas. Incluyen cookies de sesión, autenticación y
                  seguridad.
                </p>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="analytics"
                checked={consent.analytics}
                onCheckedChange={(checked) =>
                  setConsent({ ...consent, analytics: checked === true })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="analytics" className="text-base font-semibold">
                  Cookies de análisis
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nos ayudan a entender cómo los visitantes interactúan con el sitio web,
                  recopilando información de forma anónima. Esto nos permite mejorar la
                  experiencia del usuario.
                </p>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="marketing"
                checked={consent.marketing}
                onCheckedChange={(checked) =>
                  setConsent({ ...consent, marketing: checked === true })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="marketing" className="text-base font-semibold">
                  Cookies de marketing
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Utilizadas para rastrear a los visitantes en los sitios web. La intención
                  es mostrar anuncios relevantes y atractivos para el usuario individual.
                </p>
              </div>
            </div>

            {/* Preferences Cookies */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="preferences"
                checked={consent.preferences}
                onCheckedChange={(checked) =>
                  setConsent({ ...consent, preferences: checked === true })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="preferences" className="text-base font-semibold">
                  Cookies de preferencias
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Permiten que el sitio web recuerde información que cambia la forma en que
                  se comporta o se ve, como tu idioma preferido o la región en la que te
                  encuentras.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={acceptNecessary}>
              Solo necesarias
            </Button>
            <Button onClick={handleCustomConsent}>
              Guardar preferencias
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Hook to get current cookie consent
 */
export function useCookieConsent(): CookieConsent | null {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const loadConsent = () => {
      const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.version === COOKIE_CONSENT_VERSION) {
            setConsent(validateCookieConsent(parsed.consent));
          }
        } catch {
          setConsent(null);
        }
      }
    };

    loadConsent();

    // Listen for consent changes
    const handleConsentChange = (event: CustomEvent<CookieConsent>) => {
      setConsent(event.detail);
    };

    window.addEventListener(
      'cookie-consent-changed',
      handleConsentChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'cookie-consent-changed',
        handleConsentChange as EventListener
      );
    };
  }, []);

  return consent;
}
