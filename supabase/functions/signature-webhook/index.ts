import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getSignatureProvider } from '../_shared/signature-provider.ts';

serve(async (req) => {
  const provider = getSignatureProvider();
  if (!provider) return Response.json({ status: 'not_configured', mode: 'external_manual' }, { status: 503 });
  if (!await provider.verifyWebhook(req.clone())) return Response.json({ error: 'Assinatura inválida.' }, { status: 401 });
  return Response.json({ status: 'accepted', event: provider.normalizeWebhook(await req.json(), req.headers) });
});
