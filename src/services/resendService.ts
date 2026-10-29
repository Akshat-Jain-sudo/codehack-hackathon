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
    };
  } catch (err: any) {
    // If running in an environment without the serverless function
    console.warn('Unable to reach /api/auth/send-verification:', err);
    return {
      success: false,
      isSimulated: true,
      message: 'Unable to reach email delivery service. Check your connection or deployment.',
    };
  }
}

