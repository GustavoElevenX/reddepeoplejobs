import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getWhatsAppProvider } from '../_shared/whatsapp-provider.ts';

serve(async (req) => {
  const provider = getWhatsAppProvider();
  if (!provider) return Response.json({ status: 'not_configured' }, { status: 503 });
  if (!await provider.verifyWebhook(req.clone())) return Response.json({ error: 'Assinatura inválida.' }, { status: 401 });
  const event = provider.normalizeWebhook(await req.json(), req.headers);
  // A persistência será ligada ao esquema do provedor escolhido; nenhum webhook é aceito sem verificação real.
  return Response.json({ status: 'accepted', event });
});
