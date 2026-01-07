/**
 * Catalogul de clasificare a mijloacelor fixe
 * Conform HG 2139/2004 actualizat 2025
 * 
 * Structură: Cod → { denumire, durataMin, durataMax, grupa, subgrupa }
 */

export interface MijlocFix {
  cod: string;
  denumire: string;
  durataMin: number;
  durataMax: number;
  grupa: string;
  subgrupa: string;
  keywords: string[]; // Pentru căutare fuzzy
}

// ============================================================================
// CATALOGUL COMPLET HG 2139/2004
// ============================================================================

export const CATALOG_MIJLOACE_FIXE: MijlocFix[] = [
  // ============================================================================
  // GRUPA 1: CONSTRUCȚII
  // ============================================================================
  { cod: "1.1.1", denumire: "Clădiri industriale și comerciale cu structură din beton armat sau metal", durataMin: 40, durataMax: 60, grupa: "1", subgrupa: "1.1", keywords: ["clădire", "industrial", "comercial", "beton", "hală", "depozit"] },
  { cod: "1.1.2", denumire: "Clădiri administrative și social-culturale", durataMin: 40, durataMax: 60, grupa: "1", subgrupa: "1.1", keywords: ["clădire", "birou", "birouri", "sediu", "administrativ"] },
  { cod: "1.1.3", denumire: "Clădiri pentru locuințe", durataMin: 40, durataMax: 60, grupa: "1", subgrupa: "1.1", keywords: ["locuință", "apartament", "casă", "rezidențial"] },
  { cod: "1.1.4", denumire: "Clădiri agricole și pentru depozitare", durataMin: 30, durataMax: 50, grupa: "1", subgrupa: "1.1", keywords: ["agricol", "depozit", "siloz", "grajd", "fermă"] },
  { cod: "1.1.5", denumire: "Construcții ușoare (prefabricate, metalice)", durataMin: 20, durataMax: 30, grupa: "1", subgrupa: "1.1", keywords: ["prefabricat", "metalic", "ușor", "container"] },
  { cod: "1.2.1", denumire: "Centrale electrice și stații de transformare", durataMin: 25, durataMax: 40, grupa: "1", subgrupa: "1.2", keywords: ["centrală", "electrică", "transformator", "stație"] },
  { cod: "1.3.1", denumire: "Drumuri și alei", durataMin: 15, durataMax: 25, grupa: "1", subgrupa: "1.3", keywords: ["drum", "alee", "parcare", "asfalt", "beton"] },
  { cod: "1.3.2", denumire: "Poduri și pasarele", durataMin: 30, durataMax: 50, grupa: "1", subgrupa: "1.3", keywords: ["pod", "pasarelă", "viaduct"] },
  { cod: "1.4.1", denumire: "Împrejmuiri (garduri, ziduri)", durataMin: 15, durataMax: 25, grupa: "1", subgrupa: "1.4", keywords: ["gard", "zid", "împrejmuire", "poartă"] },
  
  // ============================================================================
  // GRUPA 2.1: ECHIPAMENTE TEHNOLOGICE (MAȘINI, UTILAJE, INSTALAȚII)
  // ============================================================================
  
  // 2.1.1 - Mașini, utilaje și instalații de lucru (generale)
  { cod: "2.1.1.1", denumire: "Cazane de abur și apă caldă", durataMin: 10, durataMax: 20, grupa: "2", subgrupa: "2.1.1", keywords: ["cazan", "abur", "apă caldă", "boiler industrial"] },
  { cod: "2.1.1.2", denumire: "Compresoare", durataMin: 8, durataMax: 15, grupa: "2", subgrupa: "2.1.1", keywords: ["compresor", "aer comprimat"] },
  { cod: "2.1.1.3", denumire: "Pompe și stații de pompare", durataMin: 8, durataMax: 15, grupa: "2", subgrupa: "2.1.1", keywords: ["pompă", "stație pompare", "hidraulic"] },
  { cod: "2.1.1.4", denumire: "Ventilatoare și exhaustoare industriale", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.1", keywords: ["ventilator", "exhaustor", "aerisire"] },
  { cod: "2.1.1.5", denumire: "Echipamente frigorifice industriale", durataMin: 10, durataMax: 15, grupa: "2", subgrupa: "2.1.1", keywords: ["frigider", "congelator", "răcire", "refrigerare", "cameră frigorifică"] },
  
  // 2.1.2 - Mașini-unelte
  { cod: "2.1.2.1", denumire: "Strunguri", durataMin: 10, durataMax: 18, grupa: "2", subgrupa: "2.1.2", keywords: ["strung", "strungărie", "prelucrare metale"] },
  { cod: "2.1.2.2", denumire: "Mașini de frezat", durataMin: 10, durataMax: 18, grupa: "2", subgrupa: "2.1.2", keywords: ["freză", "frezat", "frezare"] },
  { cod: "2.1.2.3", denumire: "Mașini de găurit și alezat", durataMin: 10, durataMax: 15, grupa: "2", subgrupa: "2.1.2", keywords: ["găurit", "alezat", "burghiu", "găurire"] },
  { cod: "2.1.2.4", denumire: "Mașini de rectificat", durataMin: 10, durataMax: 15, grupa: "2", subgrupa: "2.1.2", keywords: ["rectificat", "rectificare", "șlefuit"] },
  { cod: "2.1.2.5", denumire: "Mașini de rabotat și mortezat", durataMin: 10, durataMax: 15, grupa: "2", subgrupa: "2.1.2", keywords: ["rabotat", "mortezat"] },
  { cod: "2.1.2.6", denumire: "Centre de prelucrare CNC", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.2", keywords: ["cnc", "comandă numerică", "centru prelucrare", "automatizat"] },
  
  // 2.1.3 - Utilaje pentru construcții
  { cod: "2.1.3.1", denumire: "Excavatoare și buldozere", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.3", keywords: ["excavator", "buldozer", "săpat", "terasament"] },
  { cod: "2.1.3.2", denumire: "Macarale și poduri rulante", durataMin: 10, durataMax: 18, grupa: "2", subgrupa: "2.1.3", keywords: ["macara", "pod rulant", "ridicat", "stivuitor mare"] },
  { cod: "2.1.3.3", denumire: "Betoniere și instalații de beton", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.3", keywords: ["betonieră", "beton", "ciment", "malaxor beton"] },
  { cod: "2.1.3.4", denumire: "Utilaje pentru asfalt", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.3", keywords: ["asfalt", "finișor", "cilindru compactor"] },
  
  // 2.1.4 - Utilaje pentru agricultură
  { cod: "2.1.4.1", denumire: "Tractoare agricole", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.4", keywords: ["tractor", "agricol", "fermă"] },
  { cod: "2.1.4.2", denumire: "Combine agricole", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.4", keywords: ["combină", "recoltă", "secerat", "cereale"] },
  { cod: "2.1.4.3", denumire: "Pluguri și grape", durataMin: 6, durataMax: 10, grupa: "2", subgrupa: "2.1.4", keywords: ["plug", "grapă", "arat", "arătură"] },
  { cod: "2.1.4.4", denumire: "Semănători și plantatori", durataMin: 6, durataMax: 10, grupa: "2", subgrupa: "2.1.4", keywords: ["semănătoare", "plantator", "semănat", "plantat"] },
  { cod: "2.1.4.5", denumire: "Sisteme de irigații", durataMin: 8, durataMax: 15, grupa: "2", subgrupa: "2.1.4", keywords: ["irigație", "udare", "stropire", "aspersoare"] },
  
  // 2.1.5 - Echipamente pentru industria alimentară
  { cod: "2.1.5.1", denumire: "Mori și mașini de măcinat", durataMin: 10, durataMax: 18, grupa: "2", subgrupa: "2.1.5", keywords: ["moară", "măcinat", "făină", "cereale"] },
  { cod: "2.1.5.2", denumire: "Cuptoare industriale pentru panificație", durataMin: 10, durataMax: 15, grupa: "2", subgrupa: "2.1.5", keywords: ["cuptor", "panificație", "pâine", "brutărie", "patiserie"] },
  { cod: "2.1.5.3", denumire: "Linii de îmbuteliere", durataMin: 8, durataMax: 15, grupa: "2", subgrupa: "2.1.5", keywords: ["îmbuteliere", "sticle", "pet", "băuturi"] },
  { cod: "2.1.5.4", denumire: "Echipamente pentru prelucrarea cărnii", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.5", keywords: ["carne", "măcelărie", "carmangerie", "tocător", "malaxor carne"] },
  { cod: "2.1.5.5", denumire: "Echipamente pentru prelucrarea laptelui", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.5", keywords: ["lapte", "lactate", "pasteurizare", "separator lapte"] },
  
  // 2.1.6 - Echipamente pentru industria textilă
  { cod: "2.1.6.1", denumire: "Mașini de țesut", durataMin: 10, durataMax: 15, grupa: "2", subgrupa: "2.1.6", keywords: ["țesut", "țesătorie", "război țesut"] },
  { cod: "2.1.6.2", denumire: "Mașini de tricotat", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.6", keywords: ["tricotat", "tricotaje", "mașină tricotat"] },
  { cod: "2.1.6.3", denumire: "Mașini de cusut industriale", durataMin: 6, durataMax: 10, grupa: "2", subgrupa: "2.1.6", keywords: ["cusut", "mașină cusut", "confecții", "croitorie"] },
  
  // 2.1.7 - Echipamente pentru tipografie și edituri
  { cod: "2.1.7.1", denumire: "Mașini de tipărit offset", durataMin: 8, durataMax: 15, grupa: "2", subgrupa: "2.1.7", keywords: ["tipărit", "offset", "tipografie", "imprimare"] },
  { cod: "2.1.7.2", denumire: "Mașini de tipărit digital", durataMin: 5, durataMax: 8, grupa: "2", subgrupa: "2.1.7", keywords: ["tipărit digital", "printare", "copiatoare industriale"] },
  { cod: "2.1.7.3", denumire: "Mașini de legat cărți", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.7", keywords: ["legat", "legătorie", "cărți", "broșat"] },
  
  // 2.1.8 - Echipamente pentru industria lemnului
  { cod: "2.1.8.1", denumire: "Gatere și ferăstraie", durataMin: 10, durataMax: 15, grupa: "2", subgrupa: "2.1.8", keywords: ["gater", "ferăstrău", "lemn", "cherestea"] },
  { cod: "2.1.8.2", denumire: "Mașini de rindeluit", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.8", keywords: ["rindeluit", "rindea", "prelucrare lemn"] },
  { cod: "2.1.8.3", denumire: "Mașini pentru mobilă", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.1.8", keywords: ["mobilă", "tâmplărie", "dulgherie"] },
  
  // 2.1.9 - Instalații pentru producerea și distribuția energiei
  { cod: "2.1.9.1", denumire: "Generatoare electrice", durataMin: 10, durataMax: 20, grupa: "2", subgrupa: "2.1.9", keywords: ["generator", "electric", "curent", "producere energie"] },
  { cod: "2.1.9.2", denumire: "Transformatoare de putere", durataMin: 15, durataMax: 25, grupa: "2", subgrupa: "2.1.9", keywords: ["transformator", "putere", "tensiune"] },
  { cod: "2.1.9.3", denumire: "Panouri fotovoltaice și invertere", durataMin: 10, durataMax: 15, grupa: "2", subgrupa: "2.1.9", keywords: ["panou", "fotovoltaic", "solar", "inverter", "energie verde"] },
  { cod: "2.1.9.4", denumire: "Turbine eoliene", durataMin: 15, durataMax: 20, grupa: "2", subgrupa: "2.1.9", keywords: ["turbină", "eoliană", "vânt", "energie verde"] },
  
  // 2.1.10 - Stații și instalații de tratare
  { cod: "2.1.10.1", denumire: "Stații de epurare", durataMin: 15, durataMax: 25, grupa: "2", subgrupa: "2.1.10", keywords: ["epurare", "ape uzate", "tratare apă"] },
  { cod: "2.1.10.2", denumire: "Instalații de filtrare industrială", durataMin: 8, durataMax: 15, grupa: "2", subgrupa: "2.1.10", keywords: ["filtrare", "filtru", "purificare"] },
  
  // ============================================================================
  // GRUPA 2.1.22 - ECHIPAMENTE IT ȘI COMUNICAȚII (RELEVANTE PENTRU ÎNTREBAREA CLIENTULUI)
  // ============================================================================
  
  { cod: "2.1.22.1", denumire: "Calculatoare și servere", durataMin: 3, durataMax: 5, grupa: "2", subgrupa: "2.1.22", keywords: ["calculator", "server", "computer", "pc", "stație lucru"] },
  { cod: "2.1.22.2", denumire: "Imprimante și copiatoare", durataMin: 4, durataMax: 6, grupa: "2", subgrupa: "2.1.22", keywords: ["imprimantă", "copiator", "multifuncțională", "scanner"] },
  { cod: "2.1.22.3", denumire: "Echipamente de rețea (routere, switch-uri)", durataMin: 4, durataMax: 6, grupa: "2", subgrupa: "2.1.22", keywords: ["router", "switch", "rețea", "networking", "hub"] },
  { cod: "2.1.22.4", denumire: "Centrale telefonice și echipamente telecomunicații", durataMin: 5, durataMax: 8, grupa: "2", subgrupa: "2.1.22", keywords: ["centrală", "telefonică", "telefon", "telecomunicații", "pbx"] },
  { cod: "2.1.22.5", denumire: "Echipamente audio-video profesionale", durataMin: 5, durataMax: 8, grupa: "2", subgrupa: "2.1.22", keywords: ["audio", "video", "camera", "proiector", "monitor profesional"] },
  
  // 🎯 EXACT codul din întrebarea clientului
  { cod: "2.1.22.6.1", denumire: "Calculatoare personale (desktop)", durataMin: 3, durataMax: 4, grupa: "2", subgrupa: "2.1.22.6", keywords: ["desktop", "pc", "calculator personal", "unitate centrală"] },
  { cod: "2.1.22.6.2", denumire: "Monitoare", durataMin: 3, durataMax: 5, grupa: "2", subgrupa: "2.1.22.6", keywords: ["monitor", "ecran", "display"] },
  { cod: "2.1.22.6.3", denumire: "Imprimante de birou", durataMin: 3, durataMax: 5, grupa: "2", subgrupa: "2.1.22.6", keywords: ["imprimantă", "birou", "laser", "inkjet"] },
  { cod: "2.1.22.6.4", denumire: "Laptop-uri și notebook-uri", durataMin: 3, durataMax: 4, grupa: "2", subgrupa: "2.1.22.6", keywords: ["laptop", "notebook", "portabil", "ultrabook", "macbook"] },
  { cod: "2.1.22.6.5", denumire: "Tablete", durataMin: 2, durataMax: 4, grupa: "2", subgrupa: "2.1.22.6", keywords: ["tabletă", "ipad", "tablet"] },
  { cod: "2.1.22.6.6", denumire: "Sisteme de stocare (NAS, SAN)", durataMin: 4, durataMax: 6, grupa: "2", subgrupa: "2.1.22.6", keywords: ["nas", "san", "stocare", "storage", "raid"] },
  { cod: "2.1.22.6.7", denumire: "UPS și surse neîntreruptibile", durataMin: 4, durataMax: 6, grupa: "2", subgrupa: "2.1.22.6", keywords: ["ups", "sursă neîntreruptibilă", "baterie", "backup power"] },
  
  // ============================================================================
  // GRUPA 2.2: APARATE DE MĂSURĂ ȘI CONTROL
  // ============================================================================
  { cod: "2.2.1", denumire: "Aparate de măsură electrice", durataMin: 6, durataMax: 10, grupa: "2", subgrupa: "2.2", keywords: ["ampermetru", "voltmetru", "multimetru", "osciloscop"] },
  { cod: "2.2.2", denumire: "Aparate de măsură mecanice", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.2", keywords: ["calibru", "micrometru", "șubler", "cântar"] },
  { cod: "2.2.3", denumire: "Aparate de control automat", durataMin: 5, durataMax: 8, grupa: "2", subgrupa: "2.2", keywords: ["plc", "automat", "controler", "automatizare"] },
  { cod: "2.2.4", denumire: "Aparate de laborator", durataMin: 8, durataMax: 12, grupa: "2", subgrupa: "2.2", keywords: ["laborator", "analiză", "microscoape", "centrifugă"] },
  
  // ============================================================================
  // GRUPA 3: APARATE ȘI INSTALAȚII DE MĂSURĂ, CONTROL, REGLARE
  // ============================================================================
  { cod: "3.1.1", denumire: "Instrumente optice de precizie", durataMin: 8, durataMax: 12, grupa: "3", subgrupa: "3.1", keywords: ["optic", "precizie", "microscop", "teodolite"] },
  { cod: "3.1.2", denumire: "Aparate de măsură și control pentru producție", durataMin: 6, durataMax: 10, grupa: "3", subgrupa: "3.1", keywords: ["măsură", "control", "calibrare", "testare"] },
  { cod: "3.2.1", denumire: "Echipamente medicale de diagnostic", durataMin: 8, durataMax: 12, grupa: "3", subgrupa: "3.2", keywords: ["medical", "diagnostic", "ecograf", "radiologie"] },
  { cod: "3.2.2", denumire: "Echipamente stomatologice", durataMin: 6, durataMax: 10, grupa: "3", subgrupa: "3.2", keywords: ["stomatologic", "dentar", "scaun dentar"] },
  
  // ============================================================================
  // GRUPA 4: MIJLOACE DE TRANSPORT
  // ============================================================================
  { cod: "4.1.1", denumire: "Autoturisme", durataMin: 4, durataMax: 6, grupa: "4", subgrupa: "4.1", keywords: ["autoturism", "mașină", "auto", "vehicul personal"] },
  { cod: "4.1.2", denumire: "Autoutilitare și camionete (sub 3.5t)", durataMin: 5, durataMax: 8, grupa: "4", subgrupa: "4.1", keywords: ["autoutilitară", "camionetă", "dubă", "van"] },
  { cod: "4.1.3", denumire: "Autocamioane (peste 3.5t)", durataMin: 6, durataMax: 10, grupa: "4", subgrupa: "4.1", keywords: ["autocamion", "camion", "tir", "transport marfă"] },
  { cod: "4.1.4", denumire: "Autobuze și microbuze", durataMin: 6, durataMax: 10, grupa: "4", subgrupa: "4.1", keywords: ["autobuz", "microbuz", "transport persoane"] },
  { cod: "4.2.1", denumire: "Remorci și semiremorci", durataMin: 8, durataMax: 12, grupa: "4", subgrupa: "4.2", keywords: ["remorcă", "semiremorcă", "trailer"] },
  { cod: "4.3.1", denumire: "Motociclete și mopede", durataMin: 4, durataMax: 6, grupa: "4", subgrupa: "4.3", keywords: ["motocicletă", "moped", "scuter"] },
  { cod: "4.4.1", denumire: "Stivuitoare și cărucioare de transport", durataMin: 6, durataMax: 10, grupa: "4", subgrupa: "4.4", keywords: ["stivuitor", "cărucior", "transpalet", "elevator"] },
  { cod: "4.5.1", denumire: "Ambarcațiuni și nave", durataMin: 10, durataMax: 20, grupa: "4", subgrupa: "4.5", keywords: ["barcă", "navă", "ambarcațiune", "vas"] },
  { cod: "4.6.1", denumire: "Aeronave", durataMin: 10, durataMax: 20, grupa: "4", subgrupa: "4.6", keywords: ["avion", "elicopter", "aeronavă", "dronă comercială"] },
  
  // ============================================================================
  // GRUPA 5: ANIMALE ȘI PLANTAȚII
  // ============================================================================
  { cod: "5.1.1", denumire: "Animale de tracțiune", durataMin: 8, durataMax: 12, grupa: "5", subgrupa: "5.1", keywords: ["cal", "măgar", "bou", "tracțiune animală"] },
  { cod: "5.1.2", denumire: "Animale de producție (bovine, porcine)", durataMin: 3, durataMax: 8, grupa: "5", subgrupa: "5.1", keywords: ["vacă", "porc", "oaie", "capră", "bovine"] },
  { cod: "5.2.1", denumire: "Plantații viticole", durataMin: 20, durataMax: 30, grupa: "5", subgrupa: "5.2", keywords: ["vie", "viță", "viticol", "podgorie"] },
  { cod: "5.2.2", denumire: "Plantații pomicole", durataMin: 15, durataMax: 30, grupa: "5", subgrupa: "5.2", keywords: ["livadă", "pom", "pomicol", "măr", "păr", "piersic"] },
  { cod: "5.2.3", denumire: "Plantații de arbuști fructiferi", durataMin: 8, durataMax: 15, grupa: "5", subgrupa: "5.2", keywords: ["arbuști", "zmeur", "căpșun", "coacăz"] },
  
  // ============================================================================
  // GRUPA 6: MOBILIER, APARATURĂ DE BIROU, SISTEME DE PROTECȚIE
  // ============================================================================
  { cod: "6.1.1", denumire: "Mobilier de birou", durataMin: 8, durataMax: 15, grupa: "6", subgrupa: "6.1", keywords: ["birou", "scaun", "masă", "dulap", "mobilier"] },
  { cod: "6.1.2", denumire: "Mobilier comercial (rafturi, vitrine)", durataMin: 8, durataMax: 12, grupa: "6", subgrupa: "6.1", keywords: ["raft", "vitrină", "gondolă", "expunere"] },
  { cod: "6.1.3", denumire: "Mobilier de restaurant și hotel", durataMin: 8, durataMax: 12, grupa: "6", subgrupa: "6.1", keywords: ["restaurant", "hotel", "pat", "canapea"] },
  { cod: "6.2.1", denumire: "Aparate de climatizare", durataMin: 8, durataMax: 12, grupa: "6", subgrupa: "6.2", keywords: ["aer condiționat", "climatizare", "ac", "hvac"] },
  { cod: "6.2.2", denumire: "Centrale termice", durataMin: 10, durataMax: 15, grupa: "6", subgrupa: "6.2", keywords: ["centrală termică", "încălzire", "cazan", "boiler"] },
  { cod: "6.3.1", denumire: "Sisteme de supraveghere video", durataMin: 5, durataMax: 8, grupa: "6", subgrupa: "6.3", keywords: ["cameră", "supraveghere", "cctv", "monitorizare", "dvr", "nvr"] },
  { cod: "6.3.2", denumire: "Sisteme de alarmă și control acces", durataMin: 5, durataMax: 8, grupa: "6", subgrupa: "6.3", keywords: ["alarmă", "antiefracție", "control acces", "interfon"] },
  { cod: "6.3.3", denumire: "Sisteme de stingere incendiu", durataMin: 10, durataMax: 15, grupa: "6", subgrupa: "6.3", keywords: ["incendiu", "stingător", "sprinkler", "psi"] },
  { cod: "6.4.1", denumire: "Case de bani și seifuri", durataMin: 15, durataMax: 25, grupa: "6", subgrupa: "6.4", keywords: ["seif", "casă bani", "tezaur"] },
  { cod: "6.5.1", denumire: "Echipamente pentru bucătării profesionale", durataMin: 8, durataMax: 12, grupa: "6", subgrupa: "6.5", keywords: ["bucătărie", "cuptor", "aragaz", "frigider comercial", "mașină spălat vase"] },
  { cod: "6.5.2", denumire: "Echipamente pentru spălătorii", durataMin: 8, durataMax: 12, grupa: "6", subgrupa: "6.5", keywords: ["spălătorie", "mașină spălat", "uscător", "călcat"] },
];

// ============================================================================
// FUNCȚII DE CĂUTARE
// ============================================================================

/**
 * Caută exact după cod
 */
export function findByCode(cod: string): MijlocFix | undefined {
  const normalizedCode = cod.trim().toUpperCase();
  return CATALOG_MIJLOACE_FIXE.find(mf => 
    mf.cod.toUpperCase() === normalizedCode || 
    mf.cod.toUpperCase().replace(/\./g, '') === normalizedCode.replace(/\./g, '')
  );
}

/**
 * Căutare fuzzy după denumire/keywords
 * Returnează toate rezultatele sortate după relevanță
 */
export function searchByKeywords(query: string): Array<MijlocFix & { score: number }> {
  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
  
  if (queryWords.length === 0) return [];
  
  const results: Array<MijlocFix & { score: number }> = [];
  
  for (const mf of CATALOG_MIJLOACE_FIXE) {
    let score = 0;
    
    // Check denumire
    const denumireLower = mf.denumire.toLowerCase();
    for (const word of queryWords) {
      if (denumireLower.includes(word)) {
        score += 10;
        // Bonus pentru match exact la început
        if (denumireLower.startsWith(word)) score += 5;
      }
    }
    
    // Check keywords
    for (const keyword of mf.keywords) {
      for (const word of queryWords) {
        if (keyword.includes(word) || word.includes(keyword)) {
          score += 8;
        }
        // Match exact pe keyword
        if (keyword === word) {
          score += 15;
        }
      }
    }
    
    if (score > 0) {
      results.push({ ...mf, score });
    }
  }
  
  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Caută cel mai bun match pentru o întrebare
 * Returnează top 3 rezultate cu confidence score
 */
export function findBestMatch(query: string): Array<{
  mijlocFix: MijlocFix;
  confidence: number;
}> {
  const results = searchByKeywords(query);
  const maxScore = results[0]?.score || 1;
  
  return results.slice(0, 3).map(result => ({
    mijlocFix: {
      cod: result.cod,
      denumire: result.denumire,
      durataMin: result.durataMin,
      durataMax: result.durataMax,
      grupa: result.grupa,
      subgrupa: result.subgrupa,
      keywords: result.keywords
    },
    confidence: Math.min(result.score / maxScore, 1)
  }));
}

/**
 * Formatează răspunsul pentru clasificare
 */
export function formatClassificationResponse(mf: MijlocFix, confidence: number): string {
  const confidenceText = confidence > 0.8 ? "cu încredere ridicată" : 
                         confidence > 0.5 ? "probabil" : "posibil";
  
  return `📋 **Clasificare mijloc fix** (${confidenceText})

**Cod clasificare:** ${mf.cod}
**Denumire:** ${mf.denumire}
**Grupa:** ${mf.grupa} - ${getGroupName(mf.grupa)}
**Durata normală de amortizare:** ${mf.durataMin}-${mf.durataMax} ani

📖 *Conform Catalogului HG 2139/2004 privind clasificarea și duratele normale de funcționare a mijloacelor fixe*`;
}

/**
 * Helper pentru numele grupelor
 */
function getGroupName(grupa: string): string {
  const groups: Record<string, string> = {
    "1": "Construcții",
    "2": "Instalații tehnice, mijloace de transport, animale și plantații",
    "3": "Aparate și instalații de măsură, control și reglare",
    "4": "Mijloace de transport",
    "5": "Animale și plantații",
    "6": "Mobilier, aparatură birotică, sisteme de protecție"
  };
  return groups[grupa] || "Altele";
}

/**
 * Detectează dacă o întrebare este despre clasificarea mijloacelor fixe
 */
export function isFixedAssetQuestion(message: string): boolean {
  const patterns = [
    /clasificar/i,
    /cod.*(?:fix|clasific|amortiz)/i,
    /amortizar/i,
    /durata.*normal/i,
    /mijloc.*fix/i,
    /hg\s*2139/i,
    /catalog.*fix/i,
    /în ce grup[aă].*se clasific/i,
    /cum.*clasific.*contabil/i,
    /ce.*cod.*(?:are|pentru)/i,
  ];
  
  return patterns.some(pattern => pattern.test(message));
}
