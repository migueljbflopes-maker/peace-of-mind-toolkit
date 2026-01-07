export type Locale = 'en' | 'pt';

export const translations = {
  en: {
    // Common
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      open: 'Open',
      continue: 'Continue',
      back: 'Back',
      notNow: 'Not now',
      comingSoon: 'Coming soon',
    },
    // Nav
    nav: {
      library: 'Library',
      bePrepared: 'Be Prepared',
      calculatorsHub: 'Calculators Hub',
      riskCalculator: 'Risk Calculator',
      suppliesPlanner: '14-Day Supplies Planner',
      products: 'Products',
      tips: 'Tips & Peace of Mind',
      news: 'News',
      pricing: 'Pricing',
      dashboard: 'Dashboard',
      startFree: 'Start Free',
      unlockPremium: 'Unlock Premium',
      login: 'Log in',
      logout: 'Log out',
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Your saved progress, in one place.',
      loginRequired: 'Log in to access your dashboard',
      loginPrompt: 'Save your assessments, plans, and access premium features.',
      loginButton: 'Log in to continue',
      savedAssessments: 'Saved Assessments',
      savedPlans: 'Saved Plans',
      noAssessments: 'No saved assessments yet.',
      noPlans: 'No saved plans yet.',
      startAssessment: 'Start a risk assessment',
      startPlan: 'Create a supplies plan',
      premiumSection: 'Premium Features',
      continueWith: 'Continue where you left off',
    },
    // Premium
    premium: {
      title: 'Premium — Personalized Resiliency Plan',
      price: '49€',
      priceNote: 'One-time purchase. No subscription.',
      unlockCta: 'Unlock Premium (49€)',
      lockedTitle: 'Premium Feature',
      lockedDescription: 'This feature is part of the Premium plan.',
      features: {
        redFolder: 'Printable offline plan PDF (Red Folder format)',
        vault: 'Encrypted Vault (IDs, contacts, medical basics)',
        plans: 'Plans A & B (exit + emergency)',
        backup: 'Encrypted backup & restore',
        insights: 'Premium insights (personalized explanation + next steps)',
        alerts: 'Real-time risk alerts (calm, personalized)',
      },
      shortcuts: {
        vault: 'Vault',
        plans: 'Plans A & B',
        redFolder: 'Red Folder Export',
        backup: 'Backup/Restore',
        alerts: 'Alerts',
      },
    },
    // Vault page
    vault: {
      title: 'Encrypted Vault',
      subtitle: 'Store sensitive information securely, encrypted with your passphrase.',
      sections: {
        ids: 'IDs & Documents',
        contacts: 'Emergency Contacts',
        medical: 'Medical Basics',
        finance: 'Financial Info',
        devices: 'Devices & Accounts',
      },
      unlockVault: 'Unlock Vault',
      passphrasePlaceholder: 'Enter your passphrase',
      comingNext: 'Full vault management coming next.',
    },
    // Plans page
    plans: {
      title: 'Plans A & B',
      subtitle: 'Your exit and emergency plans, ready when you need them.',
      planA: 'Plan A — Exit Strategy',
      planADesc: 'Your primary evacuation and relocation plan.',
      planB: 'Plan B — Shelter in Place',
      planBDesc: 'Your backup plan when evacuation isn\'t possible.',
      generateDraft: 'Generate Draft',
      editDetails: 'Edit Details',
      comingNext: 'AI-assisted plan generation coming next.',
    },
    // Red Folder page
    redFolder: {
      title: 'Red Folder Export',
      subtitle: 'Generate a printable PDF with all your essential information.',
      generatePdf: 'Generate PDF',
      preview: 'Preview',
      includes: 'Your Red Folder includes:',
      includesList: {
        contacts: 'Emergency contacts',
        plans: 'Plans A & B summary',
        supplies: 'Supplies checklist',
        medical: 'Medical information',
        documents: 'Document references',
      },
      comingNext: 'PDF generation coming next.',
    },
    // Backup page
    backup: {
      title: 'Backup & Restore',
      subtitle: 'Securely backup your data with end-to-end encryption.',
      backupNow: 'Backup Now',
      restore: 'Restore from Backup',
      explanation: 'Your backup is encrypted with your passphrase. Only you can decrypt it.',
      ciphertextNote: 'Only ciphertext is stored. We cannot read your data.',
      lastBackup: 'Last backup',
      never: 'Never',
      comingNext: 'Full backup/restore coming next.',
    },
    // Paywall modal
    paywall: {
      title: 'Unlock Premium',
      description: 'Get your Personalized Resiliency Plan: printable offline PDF, encrypted Vault, Plans A & B, backup/restore, insights, and alerts.',
    },
    // Auth
    auth: {
      login: 'Log in',
      signup: 'Sign up',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      forgotPassword: 'Forgot password?',
      noAccount: 'Don\'t have an account?',
      hasAccount: 'Already have an account?',
      loginSuccess: 'Welcome back!',
      signupSuccess: 'Account created! Check your email to confirm.',
      logoutSuccess: 'Logged out successfully.',
      invalidCredentials: 'Invalid email or password.',
      emailRequired: 'Email is required.',
      passwordRequired: 'Password is required.',
      passwordTooShort: 'Password must be at least 6 characters.',
    },
  },
  pt: {
    // Common
    common: {
      loading: 'A carregar...',
      save: 'Guardar',
      cancel: 'Cancelar',
      close: 'Fechar',
      open: 'Abrir',
      continue: 'Continuar',
      back: 'Voltar',
      notNow: 'Agora não',
      comingSoon: 'Em breve',
    },
    // Nav
    nav: {
      library: 'Biblioteca',
      bePrepared: 'Preparação',
      calculatorsHub: 'Centro de Calculadoras',
      riskCalculator: 'Calculadora de Risco',
      suppliesPlanner: 'Planeador de Suprimentos 14 Dias',
      products: 'Produtos',
      tips: 'Dicas & Tranquilidade',
      news: 'Notícias',
      pricing: 'Preços',
      dashboard: 'Painel',
      startFree: 'Começar Grátis',
      unlockPremium: 'Desbloquear Premium',
      login: 'Entrar',
      logout: 'Sair',
    },
    // Dashboard
    dashboard: {
      title: 'Painel',
      subtitle: 'O teu progresso guardado, num só lugar.',
      loginRequired: 'Entra para aceder ao teu painel',
      loginPrompt: 'Guarda as tuas avaliações, planos e acede a funcionalidades premium.',
      loginButton: 'Entrar para continuar',
      savedAssessments: 'Avaliações Guardadas',
      savedPlans: 'Planos Guardados',
      noAssessments: 'Ainda não tens avaliações guardadas.',
      noPlans: 'Ainda não tens planos guardados.',
      startAssessment: 'Iniciar uma avaliação de risco',
      startPlan: 'Criar um plano de suprimentos',
      premiumSection: 'Funcionalidades Premium',
      continueWith: 'Continuar de onde paraste',
    },
    // Premium
    premium: {
      title: 'Premium — Plano de Resiliência Personalizado',
      price: '49€',
      priceNote: 'Pagamento único. Sem subscrição.',
      unlockCta: 'Desbloquear Premium (49€)',
      lockedTitle: 'Funcionalidade Premium',
      lockedDescription: 'Esta funcionalidade faz parte do plano Premium.',
      features: {
        redFolder: 'PDF offline imprimível (formato Red Folder)',
        vault: 'Cofre Encriptado (IDs, contactos, dados médicos)',
        plans: 'Planos A & B (saída + emergência)',
        backup: 'Backup e restauro encriptado',
        insights: 'Insights premium (explicação personalizada + próximos passos)',
        alerts: 'Alertas de risco em tempo real (calmos, personalizados)',
      },
      shortcuts: {
        vault: 'Cofre',
        plans: 'Planos A & B',
        redFolder: 'Export Red Folder',
        backup: 'Backup/Restauro',
        alerts: 'Alertas',
      },
    },
    // Vault page
    vault: {
      title: 'Cofre Encriptado',
      subtitle: 'Guarda informação sensível em segurança, encriptada com a tua frase-passe.',
      sections: {
        ids: 'IDs & Documentos',
        contacts: 'Contactos de Emergência',
        medical: 'Dados Médicos Básicos',
        finance: 'Informação Financeira',
        devices: 'Dispositivos & Contas',
      },
      unlockVault: 'Desbloquear Cofre',
      passphrasePlaceholder: 'Introduz a tua frase-passe',
      comingNext: 'Gestão completa do cofre em breve.',
    },
    // Plans page
    plans: {
      title: 'Planos A & B',
      subtitle: 'Os teus planos de saída e emergência, prontos quando precisares.',
      planA: 'Plano A — Estratégia de Saída',
      planADesc: 'O teu plano principal de evacuação e relocalização.',
      planB: 'Plano B — Abrigo no Local',
      planBDesc: 'O teu plano de reserva quando a evacuação não é possível.',
      generateDraft: 'Gerar Rascunho',
      editDetails: 'Editar Detalhes',
      comingNext: 'Geração de planos assistida por IA em breve.',
    },
    // Red Folder page
    redFolder: {
      title: 'Export Red Folder',
      subtitle: 'Gera um PDF imprimível com toda a tua informação essencial.',
      generatePdf: 'Gerar PDF',
      preview: 'Pré-visualização',
      includes: 'O teu Red Folder inclui:',
      includesList: {
        contacts: 'Contactos de emergência',
        plans: 'Resumo dos Planos A & B',
        supplies: 'Lista de suprimentos',
        medical: 'Informação médica',
        documents: 'Referências de documentos',
      },
      comingNext: 'Geração de PDF em breve.',
    },
    // Backup page
    backup: {
      title: 'Backup & Restauro',
      subtitle: 'Faz backup dos teus dados em segurança com encriptação ponta-a-ponta.',
      backupNow: 'Fazer Backup Agora',
      restore: 'Restaurar de Backup',
      explanation: 'O teu backup é encriptado com a tua frase-passe. Só tu podes desencriptá-lo.',
      ciphertextNote: 'Apenas dados encriptados são guardados. Não conseguimos ler os teus dados.',
      lastBackup: 'Último backup',
      never: 'Nunca',
      comingNext: 'Backup/restauro completo em breve.',
    },
    // Paywall modal
    paywall: {
      title: 'Desbloquear Premium',
      description: 'Obtém o teu Plano de Resiliência Personalizado: PDF offline imprimível, Cofre encriptado, Planos A & B, backup/restauro, insights e alertas.',
    },
    // Auth
    auth: {
      login: 'Entrar',
      signup: 'Criar conta',
      email: 'Email',
      password: 'Palavra-passe',
      confirmPassword: 'Confirmar palavra-passe',
      forgotPassword: 'Esqueceste a palavra-passe?',
      noAccount: 'Não tens conta?',
      hasAccount: 'Já tens conta?',
      loginSuccess: 'Bem-vindo de volta!',
      signupSuccess: 'Conta criada! Verifica o teu email para confirmar.',
      logoutSuccess: 'Sessão terminada com sucesso.',
      invalidCredentials: 'Email ou palavra-passe inválidos.',
      emailRequired: 'Email é obrigatório.',
      passwordRequired: 'Palavra-passe é obrigatória.',
      passwordTooShort: 'A palavra-passe deve ter pelo menos 6 caracteres.',
    },
  },
} as const;

// Use a more flexible type that works with both languages
export type TranslationKeys = {
  common: typeof translations.en.common;
  nav: typeof translations.en.nav;
  dashboard: typeof translations.en.dashboard;
  premium: typeof translations.en.premium;
  vault: typeof translations.en.vault;
  plans: typeof translations.en.plans;
  redFolder: typeof translations.en.redFolder;
  backup: typeof translations.en.backup;
  paywall: typeof translations.en.paywall;
  auth: typeof translations.en.auth;
};
