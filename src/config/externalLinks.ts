/**
 * External Links Configuration - elimină 41 de URL-uri hardcodate
 */

export const EXTERNAL_LINKS = {
  // Academic & Research
  SPRINGER: 'https://www.springer.com/gp/computer-science',
  RESEARCHGATE: 'https://www.researchgate.net',
  JSTOR: 'https://www.jstor.org',
  EUROSTAT: 'https://ec.europa.eu/eurostat/data/database',
  INSSE: 'http://statistici.insse.ro:8077/tempo-online/',
  
  // Romanian Government
  ANAF_BILANT: 'https://www.anaf.ro/PortalBilant/',
  JUST_PORTAL: 'https://portal.just.ro/',
  TERMENE_RO: 'https://www.termene.ro/',
  E_GUVERNARE: 'https://www.e-guvernare.ro',
  DATA_PROTECTION: 'https://www.dataprotection.ro',
  
  // Tools & Services
  GOOGLE_APP_PASSWORDS: 'https://myaccount.google.com/apppasswords',
  OPEN_TIMESTAMPS: 'https://opentimestamps.org/',
  
  // Lovable
  LOVABLE_USAGE: 'https://lovable.dev/settings/workspace/usage',
  
  // GitHub
  GITHUB_REPO: 'https://github.com/velcont/yana-contabila',
  GITHUB_RELEASES: 'https://github.com/velcont/yana-contabila/releases',
  
  // Social
  WHATSAPP_BASE: 'https://wa.me/',
} as const;

/**
 * DOI Links pentru research papers
 */
export const DOI_LINKS = {
  TEECE_1997: 'https://www.jstor.org/stable/2486815',
  DUCHEK_2020: 'https://doi.org/10.1007/s40685-019-0085-7',
  HART_1995: 'https://doi.org/10.1146/annurev.es.04.110173.000245',
  SUSTAINABILITY_2013: 'https://doi.org/10.1016/j.jclepro.2013.11.039',
  TEECE_DYNAMIC: 'https://doi.org/10.1002/smj.640',
  STRATEGIC_2015: 'https://doi.org/10.5465/annals.2015.0134',
} as const;

/**
 * Helper pentru WhatsApp links
 */
export function getWhatsAppLink(phoneNumber: string, message?: string): string {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const baseUrl = EXTERNAL_LINKS.WHATSAPP_BASE + cleanNumber;
  
  if (message) {
    const encodedMessage = encodeURIComponent(message);
    return `${baseUrl}?text=${encodedMessage}`;
  }
  
  return baseUrl;
}

/**
 * Helper pentru DOI links
 */
export function getDoiLink(doi: string): string {
  return `https://doi.org/${doi}`;
}

/**
 * Helper pentru a deschide link extern
 */
export function openExternalLink(url: string, target: '_blank' | '_self' = '_blank'): void {
  window.open(url, target, target === '_blank' ? 'noopener,noreferrer' : undefined);
}
