'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
} from 'lucide-react';

interface Props {
  rfqId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

interface RFQDetails {
  id: string;
  provider_name: string;
  provider_email: string | null;
  provider_phone: string | null;
  service_type: string;
  service_details: any;
  status: string;
  provider_response: any;
  email_sent_at: string | null;
  email_received_at: string | null;
  created_at: string;
  expires_at: string | null;
  quotation_requests: any;
}

export function RFQDetailModal({ rfqId, onClose, onUpdate }: Props) {
  const [rfq, setRfq] = useState<RFQDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form state for provider response
  const [price, setPrice] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [notes, setNotes] = useState('');

  const fetchRFQDetails = async () => {
    try {
      const response = await fetch(`/api/rfqs?id=${rfqId}`);
      const data = await response.json();
      if (data.success) {
        setRfq(data.rfq);
        if (data.rfq.provider_response) {
          setPrice(data.rfq.provider_response.price || '');
          setLeadTimeDays(data.rfq.provider_response.lead_time_days || '');
          setNotes(data.rfq.provider_response.notes || '');
        }
      }
    } catch (error) {
      console.error('Error fetching RFQ details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQDetails();
  }, [rfqId]);

  const handleMarkAsReceived = async () => {
    if (!price || !leadTimeDays) {
      alert('Please fill in price and lead time');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfqId,
          status: 'received',
          providerResponse: {
            price: parseFloat(price),
            lead_time_days: parseInt(leadTimeDays),
            notes,
            currency: 'EUR',
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error updating RFQ:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsDeclined = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfqId,
          status: 'declined',
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error updating RFQ:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <Card className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
          <CardContent className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="text-sm text-muted-foreground mt-4">Loading details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!rfq) return null;

  const statusConfig: any = {
    pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    sent: { label: 'Sent', icon: Mail, color: 'bg-blue-100 text-blue-800' },
    received: { label: 'Received', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
    expired: { label: 'Expired', icon: XCircle, color: 'bg-red-100 text-red-800' },
    declined: { label: 'Declined', icon: XCircle, color: 'bg-gray-100 text-gray-800' },
  };

  const config = statusConfig[rfq.status];
  const Icon = config?.icon;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>RFQ Details</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {rfq.provider_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={config?.color}>
                <div className="flex items-center gap-1.5">
                  {Icon && <Icon className="h-3 w-3" />}
                  {config?.label}
                </div>
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Provider Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Provider Information</h3>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{rfq.provider_name}</span>
              </div>
              {rfq.provider_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${rfq.provider_email}`}
                    className="text-primary hover:underline"
                  >
                    {rfq.provider_email}
                  </a>
                </div>
              )}
              {rfq.provider_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {rfq.provider_phone}
                </div>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Service Requested</h3>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Service Type: </span>
                <span className="font-medium">{rfq.service_type}</span>
              </div>
              {rfq.service_details && (
                <>
                  {rfq.service_details.material && (
                    <div>
                      <span className="text-muted-foreground">Material: </span>
                      <span className="font-medium">
                        {rfq.service_details.material}
                      </span>
                    </div>
                  )}
                  {rfq.service_details.quantity && (
                    <div>
                      <span className="text-muted-foreground">Quantity: </span>
                      <span className="font-medium">
                        {rfq.service_details.quantity}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Related Order */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Related Customer Order</h3>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Customer: </span>
                <span className="font-medium">
                  {rfq.quotation_requests.customer_name ||
                    rfq.quotation_requests.customer_email}
                </span>
              </div>
              {rfq.quotation_requests.parts_description && (
                <div>
                  <span className="text-muted-foreground">Description: </span>
                  <span className="font-medium">
                    {rfq.quotation_requests.parts_description}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Provider Response Form/Display */}
          {rfq.status === 'sent' || rfq.status === 'pending' ? (
            <div>
              <h3 className="text-sm font-semibold mb-3">Record Provider Response</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (EUR) *</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="450.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="leadTime">Lead Time (days) *</Label>
                    <Input
                      id="leadTime"
                      type="number"
                      placeholder="5"
                      value={leadTimeDays}
                      onChange={(e) => setLeadTimeDays(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <textarea
                    id="notes"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder="Any additional notes from the provider..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleMarkAsReceived}
                    disabled={updating || !price || !leadTimeDays}
                    className="flex-1"
                  >
                    {updating ? 'Saving...' : 'Mark as Received'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleMarkAsDeclined}
                    disabled={updating}
                  >
                    Mark as Declined
                  </Button>
                </div>
              </div>
            </div>
          ) : rfq.provider_response ? (
            <div>
              <h3 className="text-sm font-semibold mb-3">Provider Response</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="text-lg font-semibold text-green-900">
                      {rfq.provider_response.price}€
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lead Time</p>
                    <p className="text-lg font-semibold text-green-900">
                      {rfq.provider_response.lead_time_days} days
                    </p>
                  </div>
                </div>
                {rfq.provider_response.notes && (
                  <div className="pt-3 border-t border-green-200">
                    <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                    <p className="text-sm">{rfq.provider_response.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              Created: {new Date(rfq.created_at).toLocaleString('es-ES')}
            </div>
            {rfq.email_sent_at && (
              <div>
                Sent: {new Date(rfq.email_sent_at).toLocaleString('es-ES')}
              </div>
            )}
            {rfq.email_received_at && (
              <div>
                Received: {new Date(rfq.email_received_at).toLocaleString('es-ES')}
              </div>
            )}
            {rfq.expires_at && (
              <div>
                Expires: {new Date(rfq.expires_at).toLocaleString('es-ES')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
