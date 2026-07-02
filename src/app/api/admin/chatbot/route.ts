import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import { getChatbotRuntimeConfig, updateChatbotRuntimeConfig } from '@/lib/site-config';
import { publishRemoteConfigPatch, remoteConfigPatchFromChatbotConfig } from '@/lib/remote-config';

const MODEL_FIELDS = new Set(['modelName', 'temperature', 'maxOutputTokens', 'systemPromptVersion']);

/** GET /api/admin/chatbot - read chatbot runtime config for support/admin staff. */
export const GET = withErrorHandling(async () => {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['customer_support', 'support_agent'])) {
    return jsonError('Not authorised.', 403);
  }

  const result = await getChatbotRuntimeConfig();
  return jsonOk({
    ...result,
    canEditModel: session?.role === 'super_admin',
  });
});

/** POST /api/admin/chatbot - update chatbot config. AI runtime fields are super-admin-only. */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['customer_support', 'support_agent'])) {
    return jsonError('Not authorised.', 403);
  }

  const body = await req.json();
  const previous = await getChatbotRuntimeConfig();
  const touchesModelConfig = Object.keys(body).some((key) => {
    if (!MODEL_FIELDS.has(key)) return false;
    const current = previous.config[key as keyof typeof previous.config];
    return body[key] !== current;
  });
  if (touchesModelConfig && session?.role !== 'super_admin') {
    return jsonError('Only a Super Admin can update chatbot model, temperature, token, or prompt-version settings.', 403);
  }
  if (touchesModelConfig && !body.confirmModelChange) {
    return jsonError('Confirm the chatbot model/runtime change before saving.', 409);
  }

  const result = await updateChatbotRuntimeConfig({ ...previous.config, ...body }, {
    uid: session?.uid ?? null,
    email: session!.email,
    previousValue: previous.config,
  });

  let remoteConfig: { published: boolean; reason?: string } = {
    published: false,
    reason: 'Remote Config publication was not requested.',
  };
  if (body.publishRemoteConfig === true) {
    remoteConfig = await publishRemoteConfigPatch(
      remoteConfigPatchFromChatbotConfig(result.config),
      `SMG chatbot runtime config updated by ${session!.email}`,
    );
  }

  return jsonOk({
    ...result,
    remoteConfig,
    canEditModel: session?.role === 'super_admin',
  });
});
