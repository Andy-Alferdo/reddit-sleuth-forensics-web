import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  inviteLink: string;
  role: string;
  expiresAt: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, inviteLink, role, expiresAt }: InviteEmailRequest = await req.json();

    console.log(`Sending invite email to ${email}`);

    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Use RESEND_FROM if valid, otherwise use the default Resend test address
    const fromEmail = Deno.env.get("RESEND_FROM");
    const validFrom = fromEmail && fromEmail.includes("@") ? fromEmail : "Reddit Sleuth <onboarding@resend.dev>";
    
    console.log(`Using from address: ${validFrom}`);

    const emailResponse = await resend.emails.send({
      from: validFrom,
      to: [email],
      subject: "You've been invited to Reddit Sleuth",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4ade80; margin: 0; font-size: 28px;">🔍 Reddit Sleuth</h1>
            <p style="color: #94a3b8; margin: 10px 0 0;">OSINT Investigation Platform</p>
          </div>
          
          <h2 style="color: #1a1a2e; margin-bottom: 20px;">You're Invited!</h2>
          
          <p>You have been invited to join Reddit Sleuth as a <strong style="color: #4ade80;">${role}</strong>.</p>
          
          <p>Reddit Sleuth is an advanced OSINT investigation platform designed for analyzing Reddit user behavior, sentiment patterns, and community relationships.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              <strong>⏰ This invitation expires on:</strong><br>
              ${expiryDate}
            </p>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #4ade80; font-size: 12px; word-break: break-all;">${inviteLink}</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            This is an automated message from Reddit Sleuth. If you did not expect this invitation, please ignore this email.
          </p>
        </body>
        </html>
      `,
    });

    if (emailResponse?.error) {
      // IMPORTANT: Resend may block sending in test mode (403) unless the domain is verified.
      // We still return 200 here so the admin UI can continue and show/copy the invite link.
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: emailResponse.error,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Invite email delivered:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse.data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    // Return 200 so the caller can handle the failure gracefully without treating it as a transport error.
    console.error("Error sending invite email:", error);
    return new Response(
      JSON.stringify({ success: false, error: { message: error.message } }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
