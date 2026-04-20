import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Heart, Plus, X, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultKey } from '@/contexts/VaultKeyContext';
import { saveSectionBlob } from '@/lib/vaultStorage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Contact {
  name: string;
  phone: string;
  email: string;
  relationship: string;
}

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function OnboardingStep2Essentials({ onNext, onBack }: Props) {
  const { t } = useLocale();
  const { encrypt, isUnlocked } = useVaultKey();
  const { user } = useAuth();
  
  const [contacts, setContacts] = useState<Contact[]>([
    { name: '', phone: '', email: '', relationship: '' }
  ]);
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [saving, setSaving] = useState(false);

  const addContact = () => {
    if (contacts.length < 3) {
      setContacts([...contacts, { name: '', phone: '', email: '', relationship: '' }]);
    }
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  const handleSave = async () => {
    if (!isUnlocked || !user) {
      toast.error('Vault not unlocked');
      return;
    }

    setSaving(true);
    try {
      // Filter out empty contacts
      const validContacts = contacts.filter(c => c.name.trim());

      // Encrypt with the in-memory Master Key
      const contactsBlob = await encrypt({ contacts: validContacts });
      await saveSectionBlob('contacts', contactsBlob);

      const medicalBlob = await encrypt({
        allergies,
        medications,
        conditions: '',
        emergencyNotes: '',
      });
      await saveSectionBlob('medical', medicalBlob);

      // Sync to Supabase if online (salt is empty in the Master Key flow)
      if (navigator.onLine) {
        await Promise.all([
          supabase.from('vault_items').upsert({
            user_id: user.id,
            section: 'contacts',
            ciphertext: contactsBlob.ciphertext,
            iv: contactsBlob.iv,
            salt: '',
            version: contactsBlob.version,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,section' }),
          supabase.from('vault_items').upsert({
            user_id: user.id,
            section: 'medical',
            ciphertext: medicalBlob.ciphertext,
            iv: medicalBlob.iv,
            salt: '',
            version: medicalBlob.version,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,section' }),
        ]);
      }

      toast.success(t.onboarding?.essentialsSaved || 'Essentials saved');
      onNext();
    } catch (err) {
      console.error('Error saving essentials:', err);
      toast.error(t.onboarding?.essentialsSaveError || 'Failed to save essentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>{t.onboarding?.step2Title || 'Add the essentials'}</CardTitle>
        <CardDescription>{t.onboarding?.step2Desc || 'Add key contacts and medical basics to your Vault.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contacts section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-medium">{t.vault.sections.contacts}</h3>
          </div>
          
          {contacts.map((contact, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3 relative">
              {contacts.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => removeContact(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t.vault.forms.contacts.name}</Label>
                  <Input
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t.vault.forms.contacts.relationship}</Label>
                  <Input
                    value={contact.relationship}
                    onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                    placeholder="Spouse, Parent..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t.vault.forms.contacts.phone}</Label>
                  <Input
                    value={contact.phone}
                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    placeholder="+1 555-0123"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t.vault.forms.contacts.email}</Label>
                  <Input
                    value={contact.email}
                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>
          ))}
          
          {contacts.length < 3 && (
            <Button type="button" variant="outline" size="sm" onClick={addContact}>
              <Plus className="h-4 w-4 mr-2" />
              {t.vault.forms.contacts.addContact}
            </Button>
          )}
        </div>

        {/* Medical basics section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <h3 className="font-medium">{t.vault.sections.medical}</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t.vault.forms.medical.allergies}</Label>
              <Textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Penicillin, peanuts..."
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">{t.vault.forms.medical.medications}</Label>
              <Textarea
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="Medication names and dosages..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t.onboarding?.essentialsNote || 'You can complete the rest later in Vault.'}
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack} disabled={saving}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t.common.back}
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.common.loading}
              </>
            ) : (
              <>
                {t.common.continue}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
