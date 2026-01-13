/**
 * Welcome Email Template
 * 
 * Sent when: setup_intent.succeeded
 * Purpose: Welcome new users and encourage them to start their journey
 */

const BASE_URL = 'https://am-i-ready.com';

/**
 * Generates the Welcome email HTML
 * @param claimCode - Optional claim code for guest purchases (creates /claim?code= URL)
 * @returns Complete HTML email string
 */
export function getWelcomeEmailHtml(claimCode?: string): string {
  const ctaUrl = claimCode 
    ? `${BASE_URL}/claim?code=${claimCode}` 
    : `${BASE_URL}/login`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Am I Ready?</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
    
    <!-- Header -->
    <div style="padding: 32px 48px; text-align: center;">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0;">
        Welcome to Am I Ready?
      </h1>
    </div>
    
    <!-- Body -->
    <div style="padding: 0 48px 32px;">
      <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 0 0 24px;">
        Thank you for joining! Your account is set up and you're ready to build your personalized emergency preparedness plan.
      </p>
      
      <!-- Feature List -->
      <ul style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 0 0 24px; padding-left: 24px;">
        <li style="margin-bottom: 8px;">Complete your Risk Assessment</li>
        <li style="margin-bottom: 8px;">Generate your Plan A & Plan B</li>
        <li style="margin-bottom: 8px;">Access the Red Folder</li>
        <li style="margin-bottom: 0;">Store info in your encrypted Vault</li>
      </ul>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${ctaUrl}" 
           style="background-color: #2563eb; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 14px 32px; text-decoration: none;">
          Get Started Now
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="padding: 24px 48px; border-top: 1px solid #e6ebf1; text-align: center;">
      <p style="color: #8898aa; font-size: 13px; margin: 0;">
        Stay prepared, stay calm.<br>
        The Am I Ready? Team
      </p>
    </div>
    
  </div>
</body>
</html>`;
}
