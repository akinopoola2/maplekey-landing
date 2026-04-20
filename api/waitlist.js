// api/waitlist.js
// Serverless function that captures waitlist signups for MapleKey
// Deployed automatically by Vercel at https://maplekey.app/api/waitlist

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract email from request body
  const { email, source } = req.body || {};

  // Basic email validation
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Reject disposable email domains (basic protection)
  const disposableDomains = ['mailinator.com', 'tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com'];
  const emailDomain = email.split('@')[1].toLowerCase();
  if (disposableDomains.includes(emailDomain)) {
    return res.status(400).json({ error: 'Please use a permanent email address' });
  }

  // Read environment variables
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    console.error('Missing Resend environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Step 1: Add contact to Resend Audience
    const addContactResponse = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          unsubscribed: false,
        }),
      }
    );

    const contactData = await addContactResponse.json();

    // Handle Resend errors, but continue if contact already exists
    if (!addContactResponse.ok) {
      const isDuplicate = contactData.name === 'validation_error' ||
                          (contactData.message && contactData.message.toLowerCase().includes('already'));

      if (!isDuplicate) {
        console.error('Resend contact error:', contactData);
        return res.status(500).json({ error: 'Could not process signup. Please try again.' });
      }
      // If duplicate, continue to send welcome email anyway (re-engagement)
    }

    // Step 2: Send welcome email to the new subscriber
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MapleKey <hello@notifications.maplekey.app>',
        to: [email],
        reply_to: 'hello@maplekey.app',
        subject: 'Welcome to MapleKey. You\'re on the list.',
        html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FAF7F2; color: #1A1410; line-height: 1.6; }
  .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; padding: 48px 40px; box-shadow: 0 4px 24px rgba(15,61,46,0.08); }
  .logo { display: inline-block; width: 48px; height: 48px; background: #0F3D2E; border-radius: 10px; text-align: center; line-height: 48px; font-size: 28px; font-weight: 600; color: #D4A849; font-family: Georgia, serif; margin-bottom: 32px; }
  h1 { font-family: Georgia, serif; font-size: 32px; font-weight: 400; line-height: 1.15; letter-spacing: -0.02em; color: #0F3D2E; margin: 0 0 20px; }
  p { font-size: 16px; line-height: 1.6; color: #4A3F36; margin: 0 0 16px; }
  .highlight { color: #0F3D2E; font-weight: 600; }
  .divider { border: 0; border-top: 1px solid rgba(26,20,16,0.1); margin: 32px 0; }
  .perks { background: #F0EADF; border-radius: 12px; padding: 24px 28px; margin: 24px 0; }
  .perks ul { padding-left: 20px; margin: 0; }
  .perks li { margin-bottom: 10px; font-size: 15px; color: #1A1410; }
  .perks li::marker { color: #D4A849; }
  .signature { margin-top: 32px; font-size: 15px; color: #4A3F36; }
  .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(26,20,16,0.08); font-size: 13px; color: #4A3F36; }
  .footer a { color: #0F3D2E; text-decoration: none; }
</style>
</head>
<body>
<div class="container">
  <div class="logo">M</div>
  <h1>Welcome to MapleKey.</h1>
  <p>Thanks for joining the waitlist. You're now among the first to know when we launch in 2026.</p>
  <p>MapleKey is being built for Canadian property managers, landlords, and owner clients who deserve better than software built for a different country. <span class="highlight">Three portals, one platform, designed for how Canadian property actually works.</span></p>

  <div class="perks">
    <p style="margin-bottom: 12px; font-weight: 600; color: #0F3D2E;">As a founding subscriber, you'll get:</p>
    <ul>
      <li><strong>50% off for life</strong> when we launch</li>
      <li>Early access before the public release</li>
      <li>Direct input on features we build</li>
      <li>Priority onboarding and support</li>
    </ul>
  </div>

  <p>I'll reach out personally as we get closer to launch. In the meantime, feel free to reply to this email with any questions, ideas, or feedback. I read every message.</p>

  <div class="signature">
    <p style="margin-bottom: 4px;"><strong>Akindele Opoola</strong></p>
    <p style="margin: 0; font-size: 13px; color: #4A3F36;">Founder, MapleKey<br>Royal LePage Top Producer · Tekreal Canadian Inc.</p>
  </div>

  <hr class="divider">

  <div class="footer">
    <p style="margin: 0;">© 2026 Tekreal Canadian Inc. · Winnipeg, Manitoba · <a href="https://maplekey.app">maplekey.app</a></p>
    <p style="margin-top: 8px; font-size: 12px; color: #7A6B5F;">You're receiving this because you joined the MapleKey waitlist.</p>
  </div>
</div>
</body>
</html>
        `.trim(),
      }),
    });

    // Return success
    return res.status(200).json({ success: true, message: 'Welcome to the waitlist' });

  } catch (error) {
    console.error('Waitlist error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
