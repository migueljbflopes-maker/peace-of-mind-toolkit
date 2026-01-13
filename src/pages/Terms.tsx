import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, CreditCard, Scale, Shield, HelpCircle } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <FileText className="h-4 w-4" />
              Legal
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Terms of Service
            </h1>
            <p className="text-muted-foreground">
              Last updated: January 2026
            </p>
          </div>

          <div className="space-y-8">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  1. Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  Welcome to <strong>am-i-ready.com</strong>. By using our service, you agree to these Terms of Service. 
                  Please read them carefully.
                </p>
                <p>
                  am-i-ready.com provides preparedness tools, risk assessments, supplies planning, and emergency 
                  communication features to help individuals and families prepare for emergencies.
                </p>
              </CardContent>
            </Card>

            {/* Nature of Service */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  2. Nature of Service
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <p>
                  am-i-ready.com is an <strong>informational and organizational tool</strong>. It is designed to help 
                  you plan and prepare for potential emergencies.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-900 not-prose">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800 dark:text-amber-400 mb-1">Important Disclaimer</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        am-i-ready.com does <strong>not</strong> replace official emergency services or guidance from 
                        local civil protection authorities. In an emergency, always follow instructions from 
                        official sources and call emergency services (112 in EU, 911 in US).
                      </p>
                    </div>
                  </div>
                </div>
                <p>
                  Risk assessments and preparedness scores are based on general guidelines and your self-reported 
                  information. They should be used as a starting point for your own planning, not as definitive 
                  safety evaluations.
                </p>
              </CardContent>
            </Card>

            {/* User Accounts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  3. User Accounts & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <p>
                  Some features require an account. You are responsible for maintaining the security of your 
                  account credentials.
                </p>
                <h4>Vault Passphrase</h4>
                <p>
                  The Vault feature uses <strong>client-side encryption</strong> with a passphrase you create. 
                  This passphrase is:
                </p>
                <ul>
                  <li>Never sent to or stored on our servers</li>
                  <li>The only way to decrypt your Vault data</li>
                  <li><strong>Unrecoverable if lost</strong> — we cannot help you access encrypted data without it</li>
                </ul>
                <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30 not-prose">
                  <p className="text-sm text-destructive font-medium">
                    If you forget your Vault passphrase, your encrypted data (IDs, medical info, financial data) 
                    cannot be recovered. Store your passphrase securely.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Premium Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  4. Premium Features & Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <p>
                  am-i-ready.com offers a <strong>Premium bundle</strong> for a one-time payment of <strong>€49</strong>.
                </p>
                <h4>What's Included</h4>
                <ul>
                  <li>Encrypted Vault for sensitive documents</li>
                  <li>AI-generated Emergency Plans (A & B)</li>
                  <li>Red Folder PDF export</li>
                  <li>Panic Button with contact alerts</li>
                  <li>Dead Man's Switch (continuity feature)</li>
                  <li>Cloud backup</li>
                </ul>
                <h4>Refund Policy</h4>
                <p>
                  Due to the digital nature of our product and immediate access to premium features upon payment, 
                  refunds are generally not available. However:
                </p>
                <ul>
                  <li>If you experience technical issues preventing access to purchased features, contact us within 
                      14 days for assistance or a refund.</li>
                  <li>Duplicate charges will be refunded immediately.</li>
                  <li>Fraudulent charges can be disputed through your payment provider.</li>
                </ul>
                <p>
                  For refund requests, contact{" "}
                  <a href="mailto:support@am-i-ready.com">support@am-i-ready.com</a> with your purchase details.
                </p>
              </CardContent>
            </Card>

            {/* User Responsibilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  5. User Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>By using am-i-ready.com, you agree to:</p>
                <ul>
                  <li>Provide accurate information in assessments and planning tools</li>
                  <li>Not use the service for any unlawful purpose</li>
                  <li>Take responsibility for your own preparedness decisions</li>
                  <li>Obtain permission from individuals before adding them as emergency contacts</li>
                  <li>Keep your account credentials and Vault passphrase secure</li>
                </ul>
              </CardContent>
            </Card>

            {/* Limitation of Liability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  6. Limitation of Liability
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <p>
                  am-i-ready.com is provided "as is" without warranties of any kind, either express or implied.
                </p>
                <p>
                  To the maximum extent permitted by law, we shall not be liable for:
                </p>
                <ul>
                  <li>Any emergency situation, injury, or loss of life</li>
                  <li>Actions taken or not taken based on information from our service</li>
                  <li>Loss of data due to forgotten passphrases or device failures</li>
                  <li>Failure of emergency alerts to reach intended recipients</li>
                  <li>Service interruptions or unavailability</li>
                  <li>Any indirect, incidental, or consequential damages</li>
                </ul>
                <p>
                  Our total liability for any claims arising from use of the service is limited to the amount 
                  you paid for Premium features in the preceding 12 months.
                </p>
              </CardContent>
            </Card>

            {/* Intellectual Property */}
            <Card>
              <CardHeader>
                <CardTitle>7. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  All content, features, and functionality of am-i-ready.com are owned by us and protected by 
                  international copyright, trademark, and other intellectual property laws.
                </p>
                <p>
                  You may use the service for personal, non-commercial purposes. You may not:
                </p>
                <ul>
                  <li>Copy, modify, or distribute our content without permission</li>
                  <li>Reverse engineer or attempt to extract source code</li>
                  <li>Use automated systems to access the service</li>
                  <li>Resell or commercially exploit the service</li>
                </ul>
              </CardContent>
            </Card>

            {/* Changes to Terms */}
            <Card>
              <CardHeader>
                <CardTitle>8. Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  We may update these Terms from time to time. We will notify you of significant changes via 
                  email or through the service. Continued use after changes constitutes acceptance of the 
                  updated Terms.
                </p>
              </CardContent>
            </Card>

            {/* Governing Law */}
            <Card>
              <CardHeader>
                <CardTitle>9. Governing Law</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  These Terms are governed by the laws of the European Union and the applicable laws of the 
                  member state where we are established. Any disputes shall be subject to the exclusive 
                  jurisdiction of the courts in that jurisdiction.
                </p>
                <p>
                  For EU consumers, nothing in these Terms affects your statutory rights under applicable 
                  consumer protection laws.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>10. Contact</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  For questions about these Terms, please contact:
                </p>
                <ul>
                  <li>General inquiries: <a href="mailto:support@am-i-ready.com">support@am-i-ready.com</a></li>
                  <li>Privacy matters: <a href="mailto:privacy@am-i-ready.com">privacy@am-i-ready.com</a></li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
