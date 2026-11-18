import type { TranslationKeys } from '@/i18n/translations';
import type { VaultKeyFailure } from '@/contexts/VaultKeyContext';

/** What to tell the user when a Recovery Kit step fails, in their language. */
export function recoveryKitErrorMessage(t: TranslationKeys, failure: VaultKeyFailure): string {
  const k = t.recoveryKit;
  switch (failure.code) {
    case 'not-saved':
      return k.errorNotSaved;
    case 'outcome-unknown':
      return k.outcomeUnknown;
    case 'already-set-up':
      return k.errorAlreadySetUp;
    case 'wrong-password':
      return k.errorWrongPassword;
    case 'wrong-phrase':
      return k.errorWrongPhrase;
    case 'invalid-phrase':
      return k.errorInvalidPhrase;
    case 'no-recovery-kit':
      return k.errorNoKit;
    case 'not-authenticated':
      return k.errorSignedOut;
    default:
      return k.errorGeneric;
  }
}
