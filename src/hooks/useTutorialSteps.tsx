import { useUserRole } from './useUserRole';

export interface TutorialStep {
  page: string;
  title: string;
  description: string;
  highlight?: string;
  action?: string;
}

export const useTutorialSteps = () => {
  const { isAdmin } = useUserRole();

  const userSteps: TutorialStep[] = [
    {
      page: '/app',
      title: 'Bine ai venit la Yana!',
      description: 'Yana este asistentul tău financiar AI care analizează balanțele tale contabile instant. Hai să vedem ce poți face!',
    },
    {
      page: '/app',
      title: 'Upload Balanță',
      description: 'Aici încarci fișierele Excel cu balanța de verificare. Poți încărca mai multe balanțe odată pentru analiză comparativă.',
      highlight: '#file-upload',
    },
    {
      page: '/app',
      title: 'Nume Firmă',
      description: 'Introdu numele firmei pentru a identifica analizele în istoric și pentru rapoarte personalizate.',
      highlight: '#company-name',
    },
    {
      page: '/app',
      title: 'Generare Analiză',
      description: 'Apasă aici pentru a genera analiza AI. Vei primi o analiză completă financiară în câteva secunde!',
      highlight: '[data-tour="analyze-button"]',
      action: 'demo-upload',
    },
    {
      page: '/app',
      title: 'Dashboard',
      description: 'Aici găsești istoricul analizelor tale, grafice interactive și indicatori financiari. Vei vedea evoluția în timp a firmei tale.',
      highlight: '[data-tour="dashboard-button"]',
    },
    {
      page: '/app',
      title: 'Chat AI - Yana',
      description: 'Chatbot-ul Yana te ajută să înțelegi mai bine datele financiare. Pune întrebări despre analize, cere sfaturi și explicații!',
      highlight: '[data-tour="chat-button"]',
    },
    {
      page: '/app',
      title: 'Conversații Vocale',
      description: 'Poți vorbi cu Yana folosind vocea! Activează microfonul și discută natural despre situația financiară.',
      highlight: '[data-tour="voice-button"]',
    },
    {
      page: '/app',
      title: 'Istoric Conversații',
      description: 'Toate conversațiile tale cu Yana sunt salvate aici. Poți reveni oricând la discuțiile anterioare.',
      highlight: '[data-tour="history-button"]',
    },
  ];

  const adminSteps: TutorialStep[] = [
    ...userSteps,
    {
      page: '/analytics',
      title: 'Analytics - Statistici Avansate',
      description: 'Aici vezi statistici detaliate despre utilizarea aplicației, cele mai populare întrebări și pattern-uri de comportament.',
    },
    {
      page: '/crm',
      title: 'CRM - Gestionare Clienți',
      description: 'Tabloul de bord pentru gestionarea utilizatorilor, conversațiilor și analizelor create.',
    },
    {
      page: '/admin',
      title: 'Admin Panel',
      description: 'Panou de administrare cu acces la toate funcțiile avansate de management.',
    },
  ];

  return {
    steps: isAdmin ? adminSteps : userSteps,
    isAdmin,
  };
};
