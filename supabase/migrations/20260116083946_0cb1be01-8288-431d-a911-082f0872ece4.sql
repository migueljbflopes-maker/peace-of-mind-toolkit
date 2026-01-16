-- Create email_templates table for editable email content
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admin full access on email_templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with default templates
INSERT INTO public.email_templates (template_type, subject, html_content) VALUES
('welcome', 'Welcome to AM-I-READY.com!', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AM-I-READY</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #1a365d 0%, #2d4a3e 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to AM-I-READY</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          You''ve taken the first step towards peace of mind. Your premium access is now active.
        </p>
        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
          Here''s what you can do now:
        </p>
        <ul style="color: #333333; font-size: 16px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
          <li>Complete your Risk Assessment</li>
          <li>Set up your Emergency Vault</li>
          <li>Create your personalized AI Plans</li>
          <li>Configure your Panic Button</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{CTA_URL}}" style="display: inline-block; background: linear-gradient(135deg, #2d4a3e 0%, #1a365d 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">{{CTA_TEXT}}</a>
        </div>
        {{BILLING_SECTION}}
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #666666; font-size: 14px; margin: 0;">
          © {{YEAR}} AM-I-READY.com. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>'),

('purchase_receipt', 'Your AM-I-READY.com Purchase Receipt', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #1a365d 0%, #2d4a3e 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Purchase Receipt</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Thank you for your purchase! Here are your receipt details:
        </p>
        <table width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0;">
          <tr>
            <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; color: #666;">Product</td>
            <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">Premium Resiliency Plan</td>
          </tr>
          <tr>
            <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; color: #666;">Amount</td>
            <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">{{AMOUNT}}</td>
          </tr>
          <tr>
            <td style="padding: 15px; color: #666;">Date</td>
            <td style="padding: 15px; text-align: right; font-weight: 600;">{{DATE}}</td>
          </tr>
        </table>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{BASE_URL}}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #2d4a3e 0%, #1a365d 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #666666; font-size: 14px; margin: 0;">
          © {{YEAR}} AM-I-READY.com. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>'),

('onboarding_reminder', 'Complete Your AM-I-READY Setup', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Setup</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #1a365d 0%, #2d4a3e 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Complete Your Setup</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          You''re just a few steps away from complete peace of mind. Here''s your checklist:
        </p>
        <ul style="color: #333333; font-size: 16px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
          <li>☐ Set up your Emergency Vault</li>
          <li>☐ Complete your Risk Assessment</li>
          <li>☐ Generate your AI Emergency Plans</li>
          <li>☐ Export your Red Folder PDF</li>
        </ul>
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #166534; font-size: 14px; margin: 0;">
            <strong>💡 Tip:</strong> Start with your Vault - it only takes 5 minutes and secures your most important information.
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{CTA_URL}}" style="display: inline-block; background: linear-gradient(135deg, #2d4a3e 0%, #1a365d 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Continue Setup</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #666666; font-size: 14px; margin: 0;">
          © {{YEAR}} AM-I-READY.com. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>');