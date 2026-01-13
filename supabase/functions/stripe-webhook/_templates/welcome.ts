/**
 * Welcome Email Template
 *
 * Sent when: setup_intent.succeeded
 * Purpose: Welcome new users and guide them to start + manage billing
 */

const BASE_URL = "https://am-i-ready.com";
const BILLING_PORTAL_URL = "https://billing.stripe.com/p/login/dRm8wP1JE5SPfSUf6s5Ne00";

/**
 * Generates the Welcome email HTML
 * @param claimCode - Optional claim code for guest purchases (creates /claim?code= URL)
 * @returns Complete HTML email string
 */
export function getWelcomeEmailHtml(claimCode?: string): string {
  const ctaUrl = claimCode ? `${BASE_URL}/claim?code=${claimCode}` : `${BASE_URL}/login`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AM-I-READY.com</title>
</head>

<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f6f9fc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

    <!-- Header -->
    <div style="padding: 32px 48px; text-align: center;">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0;">
        Welcome to AM-I-READY.com!
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 0 48px 32px;">
      <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin-bottom: 20px;">
        You’ve taken the first step toward being prepared, organized, and confident — congratulations!
      </p>

      <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin-bottom: 24px;">
        With your one-time payment of <strong>€49</strong>, you now have lifetime access to all the tools you need to build and activate your personal protection plan.
      </p>

      <!-- Feature List -->
      <ul style="color: #525f7f; font-size: 16px; line-height: 26px; padding-left: 22px; margin-bottom: 28px;">
        <li>Assess your readiness and identify gaps</li>
        <li>Create simple, actionable plans for any situation</li>
        <li>Secure important information in a private, encrypted vault</li>
        <li>Activate your plan instantly when it matters most</li>
      </ul>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${ctaUrl}"
           style="background-color: #2563eb; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 14px 32px; text-decoration: none;">
          Start My Plan
        </a>
      </div>

      <!-- Billing Portal -->
      <div style="margin-top: 32px; text-align: center;">
        <p style="color: #8898aa; font-size: 14px; margin-bottom: 8px;">
          Need to manage your billing or payment details?
        </p>
        <a href="${BILLING_PORTAL_URL}"
           style="color: #2563eb; font-size: 14px; text-decoration: underline;">
          Open Billing Portal
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 48px; border-top: 1px solid #e6ebf1; text-align: center;">
      <p style="color: #8898aa; font-size: 13px; margin-bottom: 8px;">
        Thank you for trusting AM-I-READY.com — your plan, your control, your confidence.
      </p>
      <p style="color: #8898aa; font-size: 13px; margin: 0;">
        Need help? Contact us at
        <a href="mailto:support@am-i-ready.com" style="color:#2563eb;">
          support@am-i-ready.com
        </a>
      </p>
    </div>

  </div>
</body>
</html>`;
}
