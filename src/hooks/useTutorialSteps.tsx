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
      title: 'Dashboard cu Grafice',
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
    {
      page: '/analytics',
      title: 'Grafice Interactive',
      description: 'Vizualizează evoluția indicatorilor financiari în timp: profit, lichiditate, solvabilitate și mai mult.',
    },
    {
      page: '/analytics',
      title: 'Alerte Proactive',
      description: 'Primești notificări automate pentru probleme financiare critice și oportunități de îmbunătățire.',
    },
    {
      page: '/analytics',
      title: 'Predicții AI',
      description: 'AI-ul Yana prezice evoluția viitoare bazată pe datele istorice și tendințele identificate.',
    },
    {
      page: '/analytics',
      title: 'Analiză Reziliență',
      description: 'Evaluează capacitatea firmei de a rezista în fața crizelor și șocurilor economice.',
    },
    {
      page: '/analytics',
      title: 'Comparație Multi-Firmă',
      description: 'Compară performanța financiară între mai multe firme pentru a identifica cele mai bune practici.',
    },
    {
      page: '/analytics',
      title: 'Știri Fiscale',
      description: 'Rămâi la curent cu ultimele modificări legislative și fiscale relevante pentru afacerea ta.',
    },
    {
      page: '/analytics',
      title: 'Dosarul Meu',
      description: 'Istoricul complet al tuturor analizelor tale cu opțiuni de export, partajare și ștergere.',
    },
  ];

  const adminSteps: TutorialStep[] = [...userSteps];

  return {
    steps: isAdmin ? adminSteps : userSteps,
    isAdmin,
  };
};
