import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const result = await client.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('Email sent successfully:', result.data?.id);
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending email' 
    };
  }
}

function getTrackingPixel(trackingId?: string): string {
  if (!trackingId) return '';
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : 'http://localhost:5000';
  return `<img src="${baseUrl}/api/email/track/${trackingId}.png" width="1" height="1" style="display:none" alt="" />`;
}

export async function sendWelcomeEmail(email: string, trackingId?: string): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: email,
    subject: 'Welcome to ChurchHeard',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a2e;">Welcome to ChurchHeard</h1>
        <p>Thank you for joining our community. Your voice matters.</p>
        <p>ChurchHeard is a safe space where church members can share their experiences anonymously and support one another.</p>
        <p>We're glad you're here.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">You received this email because you subscribed to ChurchHeard updates.</p>
        ${getTrackingPixel(trackingId)}
      </div>
    `,
    text: `Welcome to ChurchHeard\n\nThank you for joining our community. Your voice matters.\n\nChurchHeard is a safe space where church members can share their experiences anonymously and support one another.\n\nWe're glad you're here.`
  });
}

export async function sendSubmissionNotificationEmail(
  subscriberEmail: string, 
  submissionTitle: string,
  category: string,
  trackingId?: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: subscriberEmail,
    subject: `New Story Shared: ${submissionTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a2e;">A New Story Has Been Shared</h1>
        <p>Someone in our community has shared a new experience.</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Title:</strong> ${submissionTitle}</p>
        <p>Visit ChurchHeard to read and support this story.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">You received this email because you subscribed to ChurchHeard updates.</p>
        ${getTrackingPixel(trackingId)}
      </div>
    `,
    text: `A New Story Has Been Shared\n\nSomeone in our community has shared a new experience.\n\nCategory: ${category}\nTitle: ${submissionTitle}\n\nVisit ChurchHeard to read and support this story.`
  });
}
