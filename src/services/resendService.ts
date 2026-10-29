/**
 * Client service to trigger real email delivery via Resend serverless endpoint.
 */

export interface SendVerificationEmailPayload {
  email: string;
  fullName: string;
  verificationCode: string;
  verificationLink?: string;
}

export interface SendVerificationEmailResult {
  success: boolean;
  messageId?: string;
  isSimulated?: boolean;
  error?: string;
  message?: string;
  verificationCode?: string;
}

export async function dispatchVerificationEmail(
  payload: SendVerificationEmailPayload
): Promise<SendVerificationEmailResult> {
  try {
    const response = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok && !data.isSimulated) {
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`,
      };
    }

    return {
      success: data.success,
      messageId: data.messageId,
      isSimulated: Boolean(data.isSimulated),
      error: data.error,
      message: data.message,
      verificationCode: data.verificationCode,
    };
  } catch (err: any) {
    // If running in an environment without the serverless function (e.g. basic Vite preview without Vercel CLI)
    console.warn('Unable to reach /api/auth/send-verification:', err);
    return {
      success: false,
      isSimulated: true,
      message: 'Running in standalone client preview. Add RESEND_API_KEY on Vercel for live delivery.',
      verificationCode: payload.verificationCode,
    };
  }
}

