export type ProviderMessageResult = { providerMessageId: string; status: 'queued' | 'sent' };
export type NormalizedWhatsAppEvent = {
  providerMessageId: string;
  providerConversationId: string | null;
  direction: 'inbound' | 'outbound';
  deliveryStatus: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  from: string | null;
  body: string | null;
  occurredAt: string;
  error: string | null;
};

export interface WhatsAppProvider {
  sendMessage(input: { to: string; body: string }): Promise<ProviderMessageResult>;
  normalizeWebhook(payload: unknown, headers: Headers): NormalizedWhatsAppEvent;
  verifyWebhook(request: Request): boolean | Promise<boolean>;
}

// Um provider só deve ser retornado quando a implementação e as credenciais forem escolhidas pelo responsável.
export function getWhatsAppProvider(): WhatsAppProvider | null {
  return null;
}
