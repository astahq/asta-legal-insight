import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailAttachment {
  content: string;
  filename: string;
  path?: string;
  content_type?: string;
  content_id?: string;
}

interface EmailTag {
  name: string;
  value: string;
}

interface EmailTemplate {
  id: string;
  variables?: Record<string, string | number>;
}

interface SendEmailRequest {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Server-to-server only: this function sends arbitrary emails, so it must
  // never be callable with a user or anon token.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!serviceRoleKey || token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: SendEmailRequest = await req.json();

    if (!body.from || !body.to) {
      return new Response(
        JSON.stringify({ error: "from and to are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (body.template && (body.html || body.text)) {
      return new Response(
        JSON.stringify({
          error: "Cannot use template with html or text fields",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!body.template && !body.html && !body.text) {
      return new Response(
        JSON.stringify({
          error: "Either template, html, or text is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailPayload: Record<string, unknown> = {
      from: body.from,
      to: body.to,
    };

    if (body.subject) {
      emailPayload.subject = body.subject;
    }

    if (body.template) {
      emailPayload.template = {
        id: body.template.id,
        variables: body.template.variables || {},
      };
    } else {
      if (body.html) {
        emailPayload.html = body.html;
      }
      if (body.text !== undefined) {
        emailPayload.text = body.text;
      }
    }

    if (body.bcc) {
      emailPayload.bcc = body.bcc;
    }

    if (body.cc) {
      emailPayload.cc = body.cc;
    }

    if (body.reply_to) {
      emailPayload.reply_to = body.reply_to;
    }

    if (body.headers) {
      emailPayload.headers = body.headers;
    }

    if (body.attachments && body.attachments.length > 0) {
      emailPayload.attachments = body.attachments;
    }

    if (body.tags && body.tags.length > 0) {
      emailPayload.tags = body.tags;
    }

    if (body.scheduled_at) {
      emailPayload.scheduled_at = body.scheduled_at;
    }

    if (body.topic_id) {
      emailPayload.topic_id = body.topic_id;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || data.error || "Failed to send email" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to send email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
