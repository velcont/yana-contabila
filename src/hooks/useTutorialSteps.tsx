import { useUserRole } from './useUserRole';
import { useThemeRole } from '@/contexts/ThemeRoleContext';

export interface TutorialStep {
  page: string;
  title: string;
  description: string;
  highlight?: string;
  action?: string;
}

export const useTutorialSteps = () => {
  const { isAdmin } = useUserRole();
  const { currentTheme } = useThemeRole();
  
  const isAccountant = currentTheme === 'accountant';

  const entrepreneurSteps: TutorialStep[] = [
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
      description: 'Cel mai rapid mod: deschide Chat-ul și încarcă balanța Excel direct acolo folosind butonul cu agrafa! Vei primi o analiză completă în câteva secunde.',
      highlight: '[data-tour="chat-button"]',
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

  const accountantSteps: TutorialStep[] = [
    {
      page: '/accountant-dashboard',
      title: 'Bine ai venit la Yana pentru Contabili!',
      description: 'Yana te ajută să gestionezi eficient clienții și analizele lor financiare. Hai să descoperim funcțiile principale!',
    },
    {
      page: '/crm',
      title: 'CRM Clienți',
      description: 'Gestionează toți clienții tăi dintr-un singur loc: adaugă clienți noi, trimite invitații și monitorizează activitatea acestora.',
      highlight: '[data-tour="crm-section"]',
    },
    {
      page: '/accountant-dashboard',
      title: 'Task-uri Contabile',
      description: 'Creează și gestionează task-uri pentru fiecare client: depuneri, raportări, întâlniri. Totul organizat și la timp!',
      highlight: '[data-tour="tasks-manager"]',
    },
    {
      page: '/accountant-dashboard',
      title: 'Analize Clienți',
      description: 'Vezi toate analizele generate pentru clienții tăi. Poți accesa rapid situația financiară a oricărui client.',
      highlight: '[data-tour="client-analyses"]',
    },
    {
      page: '/crm',
      title: 'Mesagerie Clienți',
      description: 'Comunică direct cu clienții tăi prin sistemul integrat de mesagerie. Toate conversațiile sunt salvate și organizate.',
      highlight: '[data-tour="messaging"]',
    },
    {
      page: '/accountant-dashboard',
      title: 'Broadcast Email',
      description: 'Trimite email-uri în masă către toți clienții sau grupuri selectate pentru notificări importante și newsletter-uri.',
      highlight: '[data-tour="email-broadcast"]',
    },
    {
      page: '/accountant-dashboard',
      title: 'Termene Fiscale',
      description: 'Monitorizează toate termenele fiscale importante pentru clienții tăi. Primești alerte automate înainte de deadline-uri.',
      highlight: '[data-tour="fiscal-deadlines"]',
    },
    {
      page: '/accountant-dashboard',
      title: 'Documente Clienți',
      description: 'Gestionează documentele fiecărui client într-un loc securizat. Upload, organizare și acces rapid la toate fișierele.',
      highlight: '[data-tour="client-documents"]',
    },
    {
      page: '/accountant-branding',
      title: 'Branding Personal',
      description: 'Personalizează aplicația cu logo-ul tău și culori custom pentru a oferi o experiență branded clienților tăi.',
      highlight: '[data-tour="branding"]',
    },
    {
      page: '/accountant-dashboard',
      title: 'Rapoarte Agregare',
      description: 'Generează rapoarte consolidate pentru toți clienții sau pe categorii specifice pentru analiza portofoliului tău.',
      highlight: '[data-tour="reports"]',
    },
  ];

  const adminSteps: TutorialStep[] = [...entrepreneurSteps];

  return {
    steps: isAdmin ? adminSteps : (isAccountant ? accountantSteps : entrepreneurSteps),
    isAdmin,
  };
};
