import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Database, Lock, Globe, Mail, FileText, Clock, UserCheck } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              GDPR Compliant
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">
              Last updated: January 2026
            </p>
          </div>

          <div className="space-y-8">
            {/* Controller */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Data Controller
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  <strong>am-i-ready.com</strong> is the data controller for personal data collected through this service.
                </p>
                <p>
                  For any privacy-related inquiries, please contact us at:{" "}
                  <a href="mailto:privacy@am-i-ready.com" className="text-primary hover:underline">
                    privacy@am-i-ready.com
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Data Collected */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Data We Collect & Legal Basis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Category</th>
                        <th className="text-left py-2 font-medium">Data</th>
                        <th className="text-left py-2 font-medium">Legal Basis (GDPR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2">Account</td>
                        <td className="py-2 text-muted-foreground">Email, password (optional)</td>
                        <td className="py-2 text-muted-foreground">Contract (Art. 6.1.b)</td>
                      </tr>
                      <tr>
                        <td className="py-2">Profile</td>
                        <td className="py-2 text-muted-foreground">Country, timezone, language</td>
                        <td className="py-2 text-muted-foreground">Contract (Art. 6.1.b)</td>
                      </tr>
                      <tr>
                        <td className="py-2">Risk Assessment</td>
                        <td className="py-2 text-muted-foreground">City, quiz answers, score</td>
                        <td className="py-2 text-muted-foreground">Legitimate Interest (Art. 6.1.f)</td>
                      </tr>
                      <tr>
                        <td className="py-2">Supplies Plan</td>
                        <td className="py-2 text-muted-foreground">Household size, dietary needs</td>
                        <td className="py-2 text-muted-foreground">Legitimate Interest (Art. 6.1.f)</td>
                      </tr>
                      <tr className="bg-amber-50 dark:bg-amber-950/30">
                        <td className="py-2 font-medium">Vault (Premium)</td>
                        <td className="py-2 text-muted-foreground">IDs, medical info, contacts, financial data</td>
                        <td className="py-2 font-medium text-amber-700 dark:text-amber-400">Explicit Consent (Art. 9.2.a)</td>
                      </tr>
                      <tr className="bg-amber-50 dark:bg-amber-950/30">
                        <td className="py-2 font-medium">Panic Contacts</td>
                        <td className="py-2 text-muted-foreground">Third-party name, phone, email</td>
                        <td className="py-2 font-medium text-amber-700 dark:text-amber-400">Consent + Vital Interest (Art. 6.1.d)</td>
                      </tr>
                      <tr>
                        <td className="py-2">Payments</td>
                        <td className="py-2 text-muted-foreground">Processed via Stripe</td>
                        <td className="py-2 text-muted-foreground">Contract (Art. 6.1.b)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Sensitive Data */}
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Lock className="h-5 w-5" />
                  Special Category Data (Article 9)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The <strong>Vault</strong> feature allows you to store sensitive personal data including:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                  <li>Health information (allergies, medications, medical conditions)</li>
                  <li>Identity documents (passport, ID numbers)</li>
                  <li>Financial information (insurance, account details)</li>
                </ul>
                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-900">
                  <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">Zero-Knowledge Encryption</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    All Vault data is encrypted on your device using AES-GCM encryption with your personal passphrase 
                    before being stored. Our servers <strong>never</strong> receive or store your data in readable form. 
                    If you lose your passphrase, we cannot recover your data.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Before using the Vault, you will be asked to provide <strong>explicit consent</strong> to process 
                  this sensitive data under GDPR Article 9.
                </p>
              </CardContent>
            </Card>

            {/* Third-Party Sharing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Third-Party Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">Stripe</h4>
                    <p className="text-sm text-muted-foreground">
                      Payment processing. We do not store your card details. 
                      See <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stripe's Privacy Policy</a>.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">Resend</h4>
                    <p className="text-sm text-muted-foreground">
                      Transactional emails only (login links, receipts, emergency alerts). 
                      Your email is shared to deliver these messages.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">AI Plan Generation</h4>
                    <p className="text-sm text-muted-foreground">
                      When generating preparedness plans, anonymized inputs are sent to our AI provider. 
                      No personally identifiable information is included.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">News Sources</h4>
                    <p className="text-sm text-muted-foreground">
                      We fetch public data from GDACS, USGS, and ReliefWeb. 
                      No personal data is shared with these services.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Local Storage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Local Storage & Cookies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  am-i-ready.com is designed as an <strong>offline-first</strong> application. We store data locally on your device:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                  <li>Encrypted Vault data (IndexedDB) for offline access</li>
                  <li>Quiz drafts and progress (localStorage)</li>
                  <li>UI preferences like language and theme (localStorage)</li>
                  <li>Authentication session tokens (essential cookies)</li>
                </ul>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>No third-party analytics or tracking.</strong> We do not use Google Analytics, 
                    Facebook Pixel, or any advertising cookies.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Data Retention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm">Account data</span>
                  <span className="text-sm text-muted-foreground">While account is active</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm">Assessments & Plans</span>
                  <span className="text-sm text-muted-foreground">While account is active</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm">Cloud backups</span>
                  <span className="text-sm text-muted-foreground">90 days after account deletion</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm">Payment records (Stripe)</span>
                  <span className="text-sm text-muted-foreground">Per Stripe's retention policy</span>
                </div>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Your GDPR Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Under the General Data Protection Regulation, you have the following rights:
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm">Right of Access</h4>
                    <p className="text-xs text-muted-foreground">Request a copy of your personal data</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm">Right to Rectification</h4>
                    <p className="text-xs text-muted-foreground">Correct inaccurate personal data</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm">Right to Erasure</h4>
                    <p className="text-xs text-muted-foreground">Request deletion of your data</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm">Right to Portability</h4>
                    <p className="text-xs text-muted-foreground">Export your data in a machine-readable format</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm">Right to Object</h4>
                    <p className="text-xs text-muted-foreground">Object to processing based on legitimate interest</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm">Withdraw Consent</h4>
                    <p className="text-xs text-muted-foreground">Withdraw consent at any time</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  To exercise any of these rights, please contact us at{" "}
                  <a href="mailto:privacy@am-i-ready.com" className="text-primary hover:underline">
                    privacy@am-i-ready.com
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Panic Contacts */}
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Mail className="h-5 w-5" />
                  Third-Party Data (Emergency Contacts)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The Panic Button feature allows you to add emergency contacts (name, phone, email) who will be 
                  notified in case of emergency.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-900">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Your responsibility:</strong> By adding emergency contacts, you confirm that you have 
                    obtained their permission to share their details with am-i-ready.com. They may receive 
                    notifications containing your location and selected emergency information.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  If you have any questions about this Privacy Policy or our data practices, please contact:
                </p>
                <p className="mt-2">
                  <a href="mailto:privacy@am-i-ready.com" className="text-primary hover:underline">
                    privacy@am-i-ready.com
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
