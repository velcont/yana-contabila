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
      title: 'Analize Recente',
      description: 'Aici vezi ultimele tale analize generate. Click pe orice analiză pentru acces rapid la dashboard și detalii complete.',
      highlight: '.animate-fade-in',
    },
    {
      page: '/app',
      title: 'Funcții Principale',
      description: 'Descoperă toate funcțiile Yana: Chat AI, Dashboard cu grafice, Comparare analize, Export PDF și multe altele!',
    },
    {
      page: '/app',
      title: 'Chat AI - Încarcă Balanța',
      description: 'Cel mai rapid mod: deschide Chat-ul și încarcă balanța Excel direct acolo! Vei primi o analiză completă în câteva secunde.',
      highlight: '[data-tour="chat-button"]',
    },
    {
      page: '/app',
      title: 'Upload Balanță Tradițional',
      description: 'Sau poți încărca fișierele Excel cu balanța aici. Poți încărca mai multe balanțe odată pentru analiză comparativă.',
      highlight: '#file-upload',
    },
    {
      page: '/app',
      title: 'Dashboard cu Grafice',
      description: 'Aici găsești istoricul analizelor tale, grafice interactive și indicatori financiari. Vei vedea evoluția în timp a firmei tale.',
      highlight: '[data-tour="dashboard-button"]',
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
      page: '/app',
      title: 'Grafice Interactive',
      description: 'Vizualizează evoluția indicatorilor financiari în timp: profit, lichiditate, solvabilitate și mai mult.',
      highlight: '[data-tour="tab-analytics"]',
    },
    {
      page: '/app',
      title: 'Alerte Proactive',
      description: 'Primești notificări automate pentru probleme financiare critice și oportunități de îmbunătățire.',
      highlight: '[data-tour="tab-alerts"]',
    },
    {
      page: '/app',
      title: 'Predicții AI',
      description: 'AI-ul Yana prezice evoluția viitoare bazată pe datele istorice și tendințele identificate.',
      highlight: '[data-tour="tab-predictions"]',
    },
    {
      page: '/app',
      title: 'Analiză Reziliență',
      description: 'Evaluează capacitatea firmei de a rezista în fața crizelor și șocurilor economice.',
      highlight: '[data-tour="tab-resilience"]',
    },
    {
      page: '/app',
      title: 'Comparație Multi-Firmă',
      description: 'Compară performanța financiară între mai multe firme pentru a identifica cele mai bune practici.',
      highlight: '[data-tour="tab-multi-company"]',
    },
    {
      page: '/app',
      title: 'Știri Fiscale',
      description: 'Rămâi la curent cu ultimele modificări legislative și fiscale relevante pentru afacerea ta.',
      highlight: '[data-tour="tab-news"]',
    },
    {
      page: '/app',
      title: 'Dosarul Meu',
      description: 'Istoricul complet al tuturor analizelor tale cu opțiuni de export, partajare și ștergere.',
      highlight: '[data-tour="tab-history"]',
    },
  ];

  const adminSteps: TutorialStep[] = [...userSteps];

  return {
    steps: isAdmin ? adminSteps : userSteps,
    isAdmin,
  };
};
