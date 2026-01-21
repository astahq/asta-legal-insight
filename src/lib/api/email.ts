import { supabase } from "@/integrations/supabase/client";

export interface EmailAttachment {
  content: string;
  filename: string;
  path?: string;
  content_type?: string;
  content_id?: string;
}

export interface EmailTag {
  name: string;
  value: string;
}

export interface EmailTemplate {
  id: string;
  variables?: Record<string, string | number>;
}

export interface SendEmailRequest {
  from: string;
  to: string | string[];
  subject?: string;
  template?: EmailTemplate;
  html?: string;
  text?: string;
  bcc?: string | string[];
  cc?: string | string[];
  reply_to?: string | string[];
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
  tags?: EmailTag[];
  scheduled_at?: string;
  topic_id?: string;
}

export interface SendEmailResponse {
  id: string;
}

export interface SendEmailError {
  error: string;
}

export async function sendEmail(
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: request,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as SendEmailResponse;
}
