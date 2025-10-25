'use client';

import { useEffect, useState } from 'react';
import { LayoutNavigation } from '../layout-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Settings as SettingsIcon,
  Save,
  Plus,
  X,
  CheckCircle2,
  Building2,
} from 'lucide-react';

interface Service {
  name: string;
  key: string;
  description: string;
  materials: string[];
  enabled?: boolean;
  reason?: string;
}

interface Settings {
  internal_services?: { services: Service[] };
  external_services?: { services: Service[] };
  company_info?: any;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Guardar servicios internos
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'internal_services',
          settingValue: settings.internal_services,
        }),
      });

      // Guardar servicios externos
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'external_services',
          settingValue: settings.external_services,
        }),
      });

      // Guardar info de empresa
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'company_info',
          settingValue: settings.company_info,
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleInternalService = (index: number) => {
    if (!settings.internal_services) return;
    const updated = { ...settings };
    updated.internal_services!.services[index].enabled =
      !updated.internal_services!.services[index].enabled;
    setSettings(updated);
  };

  const addInternalService = () => {
    if (!settings.internal_services) return;
    const updated = { ...settings };
    updated.internal_services!.services.push({
      name: 'Nuevo Servicio',
      key: 'new_service',
      description: 'Descripción del servicio',
      materials: ['aluminio'],
      enabled: true,
    });
    setSettings(updated);
  };

  const removeInternalService = (index: number) => {
    if (!settings.internal_services) return;
    const updated = { ...settings };
    updated.internal_services!.services.splice(index, 1);
    setSettings(updated);
  };

  const updateInternalService = (index: number, field: string, value: any) => {
    if (!settings.internal_services) return;
    const updated = { ...settings };
    (updated.internal_services!.services[index] as any)[field] = value;
    setSettings(updated);
  };

  const addExternalService = () => {
    if (!settings.external_services) return;
    const updated = { ...settings };
    updated.external_services!.services.push({
      name: 'Nuevo Servicio Externo',
      key: 'new_external_service',
      description: 'Descripción del servicio',
      materials: ['todos'],
      reason: 'Requiere proveedor especializado',
    });
    setSettings(updated);
  };

  const removeExternalService = (index: number) => {
    if (!settings.external_services) return;
    const updated = { ...settings };
    updated.external_services!.services.splice(index, 1);
    setSettings(updated);
  };

  const updateExternalService = (index: number, field: string, value: any) => {
    if (!settings.external_services) return;
    const updated = { ...settings };
    (updated.external_services!.services[index] as any)[field] = value;
    setSettings(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LayoutNavigation />

      <div className="container mx-auto px-8 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <SettingsIcon className="h-8 w-8" />
              Company Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure services and capabilities for the AI agent
            </p>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={settings.company_info?.name || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company_info: {
                          ...settings.company_info,
                          name: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={settings.company_info?.location || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company_info: {
                          ...settings.company_info,
                          location: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Internal Services */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Internal Services</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Services that your company can perform in-house
                  </p>
                </div>
                <Button size="sm" onClick={addInternalService}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.internal_services?.services.map((service, index) => (
                <Card key={index} className={!service.enabled ? 'opacity-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Input
                            placeholder="Service Name"
                            value={service.name}
                            onChange={(e) =>
                              updateInternalService(index, 'name', e.target.value)
                            }
                            className="font-medium"
                          />
                          <Badge
                            variant={service.enabled ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => toggleInternalService(index)}
                          >
                            {service.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <Input
                          placeholder="Description"
                          value={service.description}
                          onChange={(e) =>
                            updateInternalService(index, 'description', e.target.value)
                          }
                        />
                        <div>
                          <Label className="text-xs">
                            Materials (comma separated)
                          </Label>
                          <Input
                            placeholder="aluminio, acero, plasticos"
                            value={service.materials.join(', ')}
                            onChange={(e) =>
                              updateInternalService(
                                index,
                                'materials',
                                e.target.value.split(',').map((m) => m.trim())
                              )
                            }
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInternalService(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* External Services */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>External Services</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Services that require external providers (will trigger RFQs)
                  </p>
                </div>
                <Button size="sm" onClick={addExternalService}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.external_services?.services.map((service, index) => (
                <Card key={index} className="border-yellow-200 bg-yellow-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <Input
                          placeholder="Service Name"
                          value={service.name}
                          onChange={(e) =>
                            updateExternalService(index, 'name', e.target.value)
                          }
                          className="font-medium"
                        />
                        <Input
                          placeholder="Description"
                          value={service.description}
                          onChange={(e) =>
                            updateExternalService(
                              index,
                              'description',
                              e.target.value
                            )
                          }
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">
                              Materials (comma separated)
                            </Label>
                            <Input
                              placeholder="aluminio, acero, todos"
                              value={service.materials.join(', ')}
                              onChange={(e) =>
                                updateExternalService(
                                  index,
                                  'materials',
                                  e.target.value.split(',').map((m) => m.trim())
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Reason for External</Label>
                            <Input
                              placeholder="Why this needs external provider"
                              value={service.reason || ''}
                              onChange={(e) =>
                                updateExternalService(index, 'reason', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExternalService(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              size="lg"
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Changes Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save All Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
