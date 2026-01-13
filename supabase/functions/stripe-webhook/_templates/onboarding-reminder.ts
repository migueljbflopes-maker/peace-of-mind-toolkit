/**
 * Onboarding Reminder Email Template
 * 
 * Sent when: payment_intent.succeeded, setup_intent.succeeded (after welcome)
 * Purpose: Encourage users to complete their setup checklist
 */

const BASE_URL = 'https://am-i-ready.com';

/**
 * Generates the Onboarding Reminder email HTML
 * @param claimCode - Optional claim code for guest purchases
 * @returns Complete HTML email string
 */
export function getOnboardingReminderHtml(claimCode?: string): string {
  const ctaUrl = claimCode 
    ? `${BASE_URL}/claim?code=${claimCode}` 
    : `${BASE_URL}/premium/onboarding`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Setup</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
    
    <!-- Header - Blue banner -->
    <div style="padding: 32px 48px; text-align: center; background-color: #2563eb;">
      <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">
        Let's Finish Your Setup
      </h1>
      <p style="color: #bfdbfe; font-size: 16px; margin: 8px 0 0;">
        You're just a few steps away from peace of mind
      </p>
    </div>
    
    <!-- Body -->
    <div style="padding: 32px 48px;">
      <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin: 0 0 24px;">
        Thanks for signing up! Complete your setup to get the most out of your plan:
      </p>
      
      <!-- Checklist -->
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px; color: #525f7f; font-size: 15px;">
          ○ Set up your Vault
        </p>
        <p style="margin: 0 0 12px; color: #525f7f; font-size: 15px;">
          ○ Complete Risk Assessment
        </p>
        <p style="margin: 0 0 12px; color: #525f7f; font-size: 15px;">
          ○ Generate Your Plans
        </p>
        <p style="margin: 0; color: #525f7f; font-size: 15px;">
          ○ Export Red Folder
        </p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${ctaUrl}" 
           style="background-color: #2563eb; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 14px 32px; text-decoration: none;">
          Continue Setup
        </a>
      </div>
    </div>
    
    <!-- Tip Box -->
    <div style="margin: 0 48px 32px; padding: 16px 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        <strong>💡 Tip:</strong> Complete your Risk Assessment first – it personalizes everything else!
      </p>
    </div>
    
    <!-- Footer -->
    <div style="padding: 24px 48px; border-top: 1px solid #e6ebf1; text-align: center;">
      <p style="color: #aab7c4; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Am I Ready? All rights reserved.
      </p>
    </div>
    
  </div>
</body>
</html>`;
}
