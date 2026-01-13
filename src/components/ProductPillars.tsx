import { Link } from "react-router-dom";
import { Shield, AlertCircle, Lock, FileText, FolderHeart, Users, Send, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const ProductPillars = () => {
  return <section className="py-16 md:py-20 bg-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Plan. Secure. Act. Made Simple</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-4">From natural disasters to unexpected emergencies or global instability, We help you assess, plan, secure, and act.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium text-foreground">One payment, full access:</span>
            <span className="text-lg font-bold text-primary">€49</span>
            <span className="text-sm text-muted-foreground">one-time</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Safe Toolkit Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Safe Toolkit</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Your secure, encrypted hub for critical information.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Encrypted Vault</p>
                    <p className="text-xs text-muted-foreground">IDs, contacts, medical info — encrypted locally</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Plan A & Plan B</p>
                    <p className="text-xs text-muted-foreground">Action plans for staying or relocating</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FolderHeart className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Red Folder PDF</p>
                    <p className="text-xs text-muted-foreground">Printable offline document</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <Link to="/toolkit">
                  <Button variant="default" className="w-full gap-2">
                    Create Safe Toolkit
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Panic Button Card */}
          <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 to-background hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-xl">Panic Button</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                One-action emergency response and continuity.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Emergency Contacts</p>
                    <p className="text-xs text-muted-foreground">Predefined trusted people to notify</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Send className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Instant Sharing</p>
                    <p className="text-xs text-muted-foreground">Location + critical info in one action</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Safe Triggers</p>
                    <p className="text-xs text-muted-foreground">Hold-to-activate + cancel window</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex items-center justify-center mb-3">
                  <span className="text-sm font-medium text-primary">Included in Premium</span>
                </div>
                <Link to="/panic/setup">
                  <Button variant="outline" className="w-full gap-2 border-destructive/30 hover:bg-destructive/5">
                    Set Up Panic Button
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>;
};
export default ProductPillars;