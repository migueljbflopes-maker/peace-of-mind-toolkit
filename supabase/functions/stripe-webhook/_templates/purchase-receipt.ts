/**
 * Purchase Receipt Email Template
 * 
 * Sent when: payment_intent.succeeded, invoice.payment_succeeded
 * Purpose: Confirm payment and provide receipt details
 */

const BASE_URL = 'https://am-i-ready.com';
const PRODUCT_NAME = 'Personalized Resiliency Plan';

/**
 * Generates the Purchase Receipt email HTML
 * @param amount - Formatted amount string (e.g., "€49.00")
 * @param date - Formatted date string (e.g., "January 15, 2025")
 * @param method - Optional payment method (e.g., "Apple Pay", "Visa •••• 4242")
 * @param txId - Optional transaction/payment intent ID
 * @param claimCode - Optional claim code for guest purchases
 * @returns Complete HTML email string
 */
export function getPurchaseReceiptHtml(
  amount: string, 
  date: string, 
  method?: string, 
  txId?: string, 
  claimCode?: string
): string {
  const ctaUrl = claimCode 
    ? `${BASE_URL}/claim?code=${claimCode}` 
    : `${BASE_URL}/login`;

  // Build optional method and transaction rows
  const methodRow = method 
    ? `<p style="color: #525f7f; font-size: 14px; margin: 8px 0;"><strong>Payment:</strong> ${method}</p>` 
    : '';
  
  const txRow = txId 
    ? `<p style="color: #525f7f; font-size: 14px; margin: 8px 0;"><strong>Transaction:</strong> <code style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${txId}</code></p>` 
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
    
    <!-- Header - Green success banner -->
    <div style="padding: 32px 48px; text-align: center; background-color: #16a34a;">
      <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">
        Payment Confirmed
      </h1>
      <p style="color: #dcfce7; font-size: 16px; margin: 8px 0 0;">
        Thank you for your purchase!
      </p>
    </div>
    
    <!-- Receipt Details -->
    <div style="padding: 32px 48px;">
      <h2 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 16px;">
        Receipt
      </h2>
      
      <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 16px 0;">
      
      <!-- Product Info -->
      <p style="margin: 0;">
        <strong style="color: #1a1a1a;">${PRODUCT_NAME}</strong><br>
        <span style="color: #8898aa; font-size: 14px;">Lifetime access to all premium features</span>
      </p>
      
      <!-- Amount -->
      <p style="text-align: right; color: #16a34a; font-size: 20px; font-weight: 700; margin: 16px 0 0;">
        ${amount}
      </p>
      
      <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 16px 0;">
      
      <!-- Transaction Details -->
      <p style="color: #525f7f; font-size: 14px; margin: 8px 0;">
        <strong>Date:</strong> ${date}
      </p>
      ${methodRow}
      ${txRow}
    </div>
    
    <!-- CTA Section -->
    <div style="padding: 32px 48px; background-color: #f8fafc; text-align: center;">
      <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 8px;">
        Access Your Plan
      </h3>
      <p style="color: #525f7f; font-size: 14px; margin: 0 0 24px;">
        Your Personalized Resiliency Plan is ready.
      </p>
      <a href="${ctaUrl}" 
         style="background-color: #2563eb; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 14px 32px; text-decoration: none;">
        Access My Plan
      </a>
    </div>
    
    <!-- Footer -->
    <div style="padding: 24px 48px; text-align: center;">
      <p style="color: #aab7c4; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Am I Ready? All rights reserved.
      </p>
    </div>
    
  </div>
</body>
</html>`;
}
