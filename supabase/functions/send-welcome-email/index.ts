import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");

serve(async (req) => {
  try {
    const { type, email, action_link } = await req.json();

    if (type !== "signup") {
      return new Response("ignored", { status: 200 });
    }

    if (!email || !action_link) {
      return new Response("invalid payload", { status: 400 });
    }

    const userName = email.split("@")[0];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: email,
        template: {
          id: "welcome-email",
          variables: {
            USER_NAME: userName,
            USER_EMAIL: email,
            VERIFICATION_LINK: action_link,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error(await response.text());
      return new Response("email failed", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});
