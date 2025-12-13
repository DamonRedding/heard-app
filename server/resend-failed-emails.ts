import { Resend } from 'resend';

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

  const connectionSettings = await fetch(
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

interface EmailItem {
  id: string;
  to: string | string[];
  from: string;
  subject: string;
  created_at: string;
  last_event: string;
  html?: string;
  text?: string;
}

async function listEmails(apiKey: string): Promise<EmailItem[]> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list emails: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function getEmail(apiKey: string, emailId: string): Promise<EmailItem | null> {
  const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.log(`  Could not get email ${emailId}: ${response.status}`);
    return null;
  }

  return response.json();
}

async function resendFailedEmails() {
  console.log('Connecting to Resend...');
  const { apiKey, fromEmail } = await getCredentials();
  const resend = new Resend(apiKey);

  console.log('Fetching recent emails...');
  
  // List recent emails using REST API
  const emails = await listEmails(apiKey);
  
  console.log(`Found ${emails.length} total emails`);

  if (emails.length === 0) {
    console.log('No emails found in Resend');
    return;
  }

  // Show all emails and their status
  console.log('\nAll emails:');
  for (const email of emails) {
    console.log(`  - ${email.to} | Subject: "${email.subject}" | Status: ${email.last_event}`);
  }

  // Filter for failed/bounced emails
  const failedEmails = emails.filter((email: EmailItem) => {
    const status = email.last_event;
    return status === 'bounced' || status === 'failed' || status === 'delivery_delayed' || 
           status === 'complained' || status === 'canceled';
  });

  console.log(`\nFound ${failedEmails.length} failed/bounced emails`);

  if (failedEmails.length === 0) {
    console.log('No failed emails to resend!');
    return;
  }

  // Resend each failed email
  let successCount = 0;
  let errorCount = 0;

  for (const email of failedEmails) {
    console.log(`\nAttempting to resend email to: ${email.to}`);
    console.log(`  Original subject: ${email.subject}`);
    console.log(`  Last event: ${email.last_event}`);
    
    try {
      // Get the original email details
      const originalEmail = await getEmail(apiKey, email.id);
      
      if (!originalEmail) {
        console.log(`  Could not retrieve original email details`);
        errorCount++;
        continue;
      }

      const toAddresses = Array.isArray(email.to) ? email.to : [email.to];
      
      // Resend the email
      const result = await resend.emails.send({
        from: fromEmail,
        to: toAddresses,
        subject: email.subject || 'ChurchHeard Notification',
        html: originalEmail.html || '<p>This is a resent notification from ChurchHeard.</p>',
        text: originalEmail.text,
      });

      if (result.error) {
        console.log(`  Failed to resend: ${result.error.message}`);
        errorCount++;
      } else {
        console.log(`  Successfully resent! New email ID: ${result.data?.id}`);
        successCount++;
      }
    } catch (error) {
      console.log(`  Error resending: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n========== Summary ==========`);
  console.log(`Total failed emails found: ${failedEmails.length}`);
  console.log(`Successfully resent: ${successCount}`);
  console.log(`Failed to resend: ${errorCount}`);
}

resendFailedEmails()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
