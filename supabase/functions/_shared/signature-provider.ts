export type SignatureDocument = { id: string; status: 'generated' | 'sent'; signingUrl: string | null };
export type SignatureEvent = { documentId: string; status: string; occurredAt: string; error: string | null };

export interface SignatureProvider {
  createDocument(input: { contractId: string; fileUrl: string }): Promise<SignatureDocument>;
  getSigningUrl(documentId: string): Promise<string>;
  cancelDocument(documentId: string): Promise<void>;
  normalizeWebhook(payload: unknown, headers: Headers): SignatureEvent;
  verifyWebhook(request: Request): boolean | Promise<boolean>;
}

// Não seleciona Clicksign, Autentique ou DocuSign sem decisão e credenciais do projeto.
export function getSignatureProvider(): SignatureProvider | null {
  return null;
}
