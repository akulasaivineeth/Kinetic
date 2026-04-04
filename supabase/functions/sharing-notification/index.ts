import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  const { recipientEmail, requesterName, inviteUrl } = await req.json();

  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not set. Skipping email send.");
    return new Response(JSON.stringify({ error: "Email provider not configured" }), { status: 200 });
  }

  // Exact UI requirement: Email with 3 explicit buttons
  // Deep-links: kinetic://accept?id=... kinetic://mutual?id=... kinetic://reject?id=...
  // In a real PWA context, these would be the standard app domain URLs.
  
  const html = `
    <div style="font-family: -apple-system, sans-serif; background: #0A0A0A; color: #F5F5F7; padding: 40px; border-radius: 20px;">
      <h1 style="color: #10B981;">KINETIC</h1>
      <p><b>${requesterName}</b> wants to share their performance data with you in the Kinetic Arena.</p>
      
      <div style="margin-top: 30px;">
        <a href="${inviteUrl}?action=accept" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-right: 10px;">ACCEPT (ONE-WAY)</a>
        <a href="${inviteUrl}?action=mutual" style="display: inline-block; border: 1px solid #10B981; color: #10B981; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-right: 10px;">ACCEPT MUTUAL</a>
        <a href="${inviteUrl}?action=reject" style="display: inline-block; color: #8E8E93; padding: 12px 24px; text-decoration: none;">REJECT</a>
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Kinetic <notifications@kinetic.app>",
        to: recipientEmail,
        subject: `${requesterName} invited you to Kinetic Arena`,
        html: html,
      }),
    });

    return new Response(JSON.stringify(await res.json()), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
