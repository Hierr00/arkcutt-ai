'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Mail, Paperclip, ArrowLeft } from 'lucide-react';

interface QuotationDetails {
  quotation: any;
  interactions: any[];
  externalQuotes: any[];
}

interface Props {
  quotationId: string;
  onClose: () => void;
}

const activityLabels: Record<string, string> = {
  email_received: 'Email Received',
  confirmation_sent: 'Confirmation Sent',
  info_request: 'Information Requested',
  info_provided: 'Information Provided',
  provider_contacted: 'Provider Contacted',
  provider_response: 'Provider Response',
  quote_received: 'Quote Received',
  agent_note: 'Agent Note',
  email_sent: 'Email Sent',
};

const activityContext: Record<string, string> = {
  email_received: 'Customer inquiry received and processed by AI',
  confirmation_sent: 'Automated confirmation email sent to customer',
  info_request: 'AI requested additional information from customer',
  info_provided: 'Customer provided requested information',
  provider_contacted: 'External provider contacted for quotation',
  provider_response: 'Response received from external provider',
  quote_received: 'Quotation received and ready for review',
  agent_note: 'Internal agent analysis or note',
  email_sent: 'Email sent to customer',
};

const activityColors: Record<string, string> = {
  inbound: 'text-blue-600',
  outbound: 'text-green-600',
};

type ModalView = 'details' | 'emails' | 'attachments';

export function QuotationDetailModal({ quotationId, onClose }: Props) {
  const [details, setDetails] = useState<QuotationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ModalView>('details');

  useEffect(() => {
    fetchDetails();
  }, [quotationId]);

  const fetchDetails = async () => {
    try {
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quotationId }),
      });

      const data = await response.json();
      if (data.success) {
        setDetails({
          quotation: data.quotation,
          interactions: data.interactions || [],
          externalQuotes: data.externalQuotes || [],
        });
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <Card className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
          <CardContent className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="text-sm text-muted-foreground mt-4">Loading details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!details) return null;

  const { quotation, interactions, externalQuotes } = details;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderEmailThreadView = () => {
    const emailInteractions = interactions.filter(
      (i: any) => i.type === 'email_received' || i.type === 'email_sent' || i.type === 'confirmation_sent' || i.type === 'info_request'
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('details')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
        </div>

        <h3 className="text-lg font-semibold mb-4">Email Thread ({emailInteractions.length} messages)</h3>

        {emailInteractions.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No emails in this thread</p>
          </div>
        ) : (
          <div className="space-y-4">
            {emailInteractions.map((email: any) => (
              <Card key={email.id} className={`${
                email.direction === 'outbound' ? 'bg-green-50/50 border-green-200' : 'bg-blue-50/50 border-blue-200'
              }`}>
                <CardContent className="p-4">
                  {/* Email Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        email.direction === 'outbound' ? 'bg-green-500' : 'bg-blue-500'
                      }`}>
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {email.direction === 'outbound' ? 'Arkcutt AI' : quotation.customer_name || quotation.customer_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {email.direction === 'outbound' ? 'to ' + quotation.customer_email : 'from ' + quotation.customer_email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={email.direction === 'outbound' ? 'default' : 'secondary'} className="text-xs">
                        {email.direction === 'outbound' ? 'Sent' : 'Received'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(email.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Email Subject */}
                  {email.subject && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground">Subject:</p>
                      <p className="font-medium text-sm">{email.subject}</p>
                    </div>
                  )}

                  <Separator className="my-3" />

                  {/* Email Body */}
                  <div className="prose prose-sm max-w-none">
                    {email.body ? (
                      <div
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: email.body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No content</p>
                    )}
                  </div>

                  {/* Email Metadata */}
                  {email.metadata && Object.keys(email.metadata).length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="bg-white/50 rounded p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Metadata:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(email.metadata).map(([key, value]: [string, any]) => (
                            <div key={key}>
                              <span className="text-muted-foreground">{key}: </span>
                              <span className="font-medium">{JSON.stringify(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAttachmentsView = () => {
    // Collect all attachments from interactions
    const attachments: any[] = [];
    interactions.forEach((interaction: any) => {
      if (interaction.metadata?.attachments) {
        const interactionAttachments = Array.isArray(interaction.metadata.attachments)
          ? interaction.metadata.attachments
          : [interaction.metadata.attachments];

        interactionAttachments.forEach((att: any) => {
          attachments.push({
            ...att,
            interactionId: interaction.id,
            interactionDate: interaction.created_at,
            interactionType: interaction.type,
          });
        });
      }
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('details')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
        </div>

        <h3 className="text-lg font-semibold mb-4">Attachments ({attachments.length})</h3>

        {attachments.length === 0 ? (
          <div className="text-center py-12">
            <Paperclip className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No attachments found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Files attached to emails will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {attachments.map((attachment: any, idx: number) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Paperclip className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{attachment.filename || attachment.name || 'Unnamed file'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attachment.mimeType || attachment.contentType || 'Unknown type'}
                      </p>
                      {attachment.size && (
                        <p className="text-xs text-muted-foreground">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        From: {activityLabels[attachment.interactionType] || attachment.interactionType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(attachment.interactionDate)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Download
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1">
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>
                {currentView === 'details' && 'Quotation Details'}
                {currentView === 'emails' && 'Email Thread'}
                {currentView === 'attachments' && 'Attachments'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {quotation.customer_email}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          {/* View Navigation Tabs */}
          <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as ModalView)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="emails" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Emails ({interactions.filter((i: any) =>
                  i.type === 'email_received' || i.type === 'email_sent' ||
                  i.type === 'confirmation_sent' || i.type === 'info_request'
                ).length})
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-6">
          {currentView === 'emails' && renderEmailThreadView()}
          {currentView === 'attachments' && renderAttachmentsView()}
          {currentView === 'details' && (
          <>
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Info */}
            <div className="space-y-6">
              {/* AI Analysis */}
              {quotation.agent_analysis && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">AI Analysis</h3>
                  <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Confidence Score</span>
                      <Badge variant={
                        quotation.agent_analysis.confidence >= 0.9 ? 'default' :
                        quotation.agent_analysis.confidence >= 0.7 ? 'outline' : 'secondary'
                      }>
                        {(quotation.agent_analysis.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Classification</span>
                      <span className="font-medium">{quotation.agent_analysis.classification || 'N/A'}</span>
                    </div>
                    {quotation.agent_analysis.reasoning && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground block mb-1">AI Reasoning</span>
                        <p className="text-xs leading-relaxed">{quotation.agent_analysis.reasoning}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Customer Information</h3>
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name: </span>
                    <span className="font-medium">{quotation.customer_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span className="font-medium">{quotation.customer_email}</span>
                  </div>
                  {quotation.customer_company && (
                    <div>
                      <span className="text-muted-foreground">Company: </span>
                      <span className="font-medium">{quotation.customer_company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Part Specifications */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Part Specifications</h3>
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Description: </span>
                    <span className="font-medium">{quotation.parts_description || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Material: </span>
                    <span className="font-medium">{quotation.material_requested || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity: </span>
                    <span className="font-medium">{quotation.quantity || 'N/A'}</span>
                  </div>
                  {quotation.tolerances && (
                    <div>
                      <span className="text-muted-foreground">Tolerances: </span>
                      <span className="font-medium">{quotation.tolerances}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* External Providers */}
              {externalQuotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    External Providers ({externalQuotes.length})
                  </h3>
                  <div className="space-y-2">
                    {externalQuotes.map((quote: any) => (
                      <div key={quote.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{quote.provider_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {quote.service_type}
                            </p>
                          </div>
                          <Badge
                            variant={quote.status === 'sent' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {quote.status}
                          </Badge>
                        </div>
                        {quote.provider_email && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {quote.provider_email}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Activity Timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Activity Timeline</h3>
              <div className="space-y-4">
                {interactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                ) : (
                  interactions.map((interaction: any, idx: number) => (
                    <div key={interaction.id} className="flex gap-3">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          interaction.direction === 'outbound' ? 'bg-green-500' : 'bg-blue-500'
                        }`} />
                        {idx < interactions.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1.5" />
                        )}
                      </div>

                      {/* Activity content */}
                      <div className="flex-1 pb-2">
                        <div className="bg-muted rounded-lg p-3 space-y-2">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`text-sm font-medium ${activityColors[interaction.direction]}`}>
                                {activityLabels[interaction.type] || interaction.type}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {activityContext[interaction.type] || 'Interaction logged'}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(interaction.created_at)}
                            </span>
                          </div>

                          {/* Agent Intent */}
                          {interaction.agent_intent && (
                            <div className="pt-2 border-t border-border/50">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Intent:</span>
                                <span className="text-xs">{interaction.agent_intent}</span>
                              </div>
                            </div>
                          )}

                          {/* Subject */}
                          {interaction.subject && (
                            <div className="pt-2 border-t border-border/50">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Subject:</span>
                                <span className="text-xs flex-1">{interaction.subject}</span>
                              </div>
                            </div>
                          )}

                          {/* Body Preview */}
                          {interaction.body && (
                            <div className="pt-2 border-t border-border/50">
                              <span className="text-xs font-medium text-muted-foreground block mb-1">Content:</span>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {interaction.body.replace(/<[^>]*>/g, '').substring(0, 200)}
                                {interaction.body.length > 200 ? '...' : ''}
                              </p>
                            </div>
                          )}

                          {/* Metadata */}
                          {interaction.metadata && Object.keys(interaction.metadata).length > 0 && (
                            <div className="pt-2 border-t border-border/50">
                              <span className="text-xs font-medium text-muted-foreground block mb-1">Details:</span>
                              <div className="space-y-1">
                                {Object.entries(interaction.metadata).map(([key, value]: [string, any]) => (
                                  <div key={key} className="flex gap-2 text-xs">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span>{JSON.stringify(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <Separator className="my-6" />
          <div className="flex gap-2">
            <Button>Create Quotation</Button>
            <Button variant="outline" onClick={() => setCurrentView('emails')}>
              View Email Thread
            </Button>
            <Button variant="outline" onClick={() => setCurrentView('attachments')}>
              View Attachments
            </Button>
          </div>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
