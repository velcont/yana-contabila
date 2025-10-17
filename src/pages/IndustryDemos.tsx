import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Truck, UtensilsCrossed, Code, Factory, ShoppingBag, ArrowLeft, TrendingUp, Brain, Crown, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface IndustryDemo {
  id: string;
  name: string;
  icon: any;
  color: string;
  companyName: string;
  messages: Message[];
}

// Demo conversations pentru TRANSPORT
const transportMessages: Message[] = [
  {
    role: "user",
    content: "Am o firmă de transport rutier internațional cu 12 camioane. Cum cresc profitabilitatea și mă extind la 25+ camioane fără să risc totul?",
    timestamp: new Date('2025-01-15T21:49:00')
  },
  {
    role: "assistant",
    content: `Transport rutier internațional = război pe marje. Combustibil care te mănâncă, clienți care negociază prețurile până la sânge, șoferi care pleacă la concurență pentru +€100/lună. Tu ești în mijlocul unui battlefield. Hai să te transformăm din jucător în DOMINATOR.

**REALITATEA TA BRUTALĂ:**
12 camioane = suficient să supraviețuiești, prea puțin să dictezi condițiile. Ești prins între giganții cu 500+ camioane care au prețuri de dumping și firme mici de 3-5 camioane care acceptă orice tarif. Zona ta de confort e pericol mortal.

**PROBLEMA TA REALĂ:**
Nu lipsa de comenzi. Lipsa de PUTERE DE NEGOCIERE. Clienții tăi știu că ai nevoie de ei mai mult decât ei de tine. Asta se termină acum.

**STRATEGIA - DOMINAȚIE PRIN SPECIALIZARE:**

1️⃣ **KILL THE GENERALIST TRAP** 
Nu mai faci "transport general". Devii SPECIALIST pe 2 vertical specifice:
• ADR (transport mărfuri periculoase) = +40% tarif față de general cargo
• PHARMA (transport farmaceutice controlat termic) = +50% tarif + clienți cu contracte anuale
• AUTOMOTIVE (just-in-time delivery piese) = tarif premium + comenzi recurente

Certificările costă €15k-25k per camion. Competiția se sperie. Tu avansezi.

2️⃣ **ROUTE OPTIMIZATION = PROFIT HIDDEN**
Software TMS (Transport Management System) nu e opțional, e ARMĂ:
• Tracking real-time consum → identifici șoferi care consumă cu 15% mai mult
• Route planning AI → elimini 200km goale/lună per camion = €800 economie/camion
• Predictive maintenance → zero breakdown pe drum = zero penalități întârziere

**INVESTIȚIE:** €8k software + €2k training
**ROI:** 4-5 luni la 12 camioane

3️⃣ **BACKWARDS INTEGRATION - CONTROL THE CHAIN**
Nu mai închiriezi trailerele. Le cumperi și le închiriezi ALTORA când tu nu le folosești:
• 12 camioane = 12-15 trailere necesare (rotație)
• Cumperi 20 trailere → 5-8 mereu libere
• Le închiriezi firmelor mici cu €150-200/săptămână
• Venit pasiv: €4,800-6,400/lună FĂRĂ să mișți un camion`,
    timestamp: new Date('2025-01-15T21:49:30')
  },
  {
    role: "user",
    content: "Hai cu soluții concrete pentru extindere",
    timestamp: new Date('2025-01-15T21:51:00')
  },
  {
    role: "assistant",
    content: `Perfect. Fără introduceri. Acționăm.

**PLAN DE EXTINDERE - 12 LA 25 CAMIOANE ÎN 18 LUNI:**

**FAZA 1 (LUNA 1-3): OPTIMIZARE BRUTALĂ A EXISTENTULUI**

📊 **DATA MINING - IDENTIFICĂ RUTELE CÂȘTIGĂTOARE**
• Analizează ultimele 12 luni: care rute = peste €1.20/km net
• Care clienți plătesc la timp + comenzi recurente
• Care șoferi = zero probleme + consum optim
• **REZULTAT:** Kill rutele sub €1.00/km, dublează pe cele profitabile

💰 **CASH FLOW BLITZ**
• Renegociază plăți cu clienții mari: NET45 → NET30 (oferă discount 2%)
• Carduri de combustibil cu discount 8-12% (mega-volume)
• Factura clienților în euro, plătește combustibil în lei când cursul e favorabil
• **IMPACT:** Eliberezi €40k-60k cash într-o lună

**FAZA 2 (LUNA 4-9): ACHIZIȚIE INTELIGENTĂ**

🚛 **CUMPĂRĂ STRATEGIC, NU EMOȚIONAL**
Nu cumperi 13 camioane deodată. Cumperi 4-5 pe verticala ta specializată:

**OPȚIUNEA A - ADR FOCUS:**
• 5 camioane ADR + 5 trailere cisternă (€400k total)
• Certificări complete (€25k)
• Client anchor contract: OMV/Rompetrol/Lukoil → garantează 70% utilizare
• **PROFIT NET:** €8k-12k/camion/lună

**OPȚIUNEA B - PHARMA FOCUS:**
• 4 camioane EURO 6 + 4 trailere frigo GDP certified (€480k)
• Parteneriat cu distribuitori pharma: Farmexpert, Mediplus
• Marjă superioară 45% vs transport general
• **PROFIT NET:** €10k-15k/camion/lună

**FINANȚARE INTELIGENTĂ:**
• Leasing operațional 20% avans + 60 luni (păstrezi cash flow)
• Sau cumperi second-hand Germania (2-3 ani vechime) = jumătate preț vs nou
• Profit din primele 6 luni acoperă avansul pentru următoarele achiziții

**FAZA 3 (LUNA 10-18): SCALE TO DOMINANCE**

📈 **CONSTRUIEȘTE DEPARTAMENT SALES**
• Angajezi 1 Sales Manager dedicat (bonus pe contracte noi)
• Target: 3-5 clienți mari cu contracte anuale (volum garantat)
• Stop dependența de bursele de marfă (tarife de mizerie)

🎯 **CREEAZĂ REȚEA SUBCONTRACTANȚI**
• Ai 25 camioane dar capacitate pentru 40-50 curse/lună
• Colaborezi cu 10-15 firme mici (3-5 camioane) ca subcontractanți
• Tu iei comenzile, ei execută sub brandul tău, margin 15-20%
• **REZULTAT:** Venit din 60 camioane, investiție în doar 25

**MATEMATICA TRANSFORMĂRII:**

**ACUM (12 camioane):**
• Revenue: €1.44M/an (€120k/lună)
• Profit net: €180k/an (12.5% margin)

**OBIECTIV (25 camioane specializate):**
• Revenue: €3.6M/an (€300k/lună)
• Profit net: €720k/an (20% margin prin specializare)
• + €80k/an venit pasiv din leasing trailere

**DIFERENȚA:** De la €180k la €800k profit/an = 4.4x creștere

**RISCUL TĂU REAL:**
Nu extinderea. STAGNAREA. Concurenții tăi fac EXACT asta în timp ce tu te gândești.

Cine mișcă primul ia piața. Cine așteaptă dispare.`,
    timestamp: new Date('2025-01-15T21:51:45')
  }
];

// Demo conversations pentru RESTAURANT
const restaurantMessages: Message[] = [
  {
    role: "user",
    content: "Am un restaurant fine dining în București. Profit scade după sezon. Cum mă extind fără să risc totul?",
    timestamp: new Date('2025-02-10T14:20:00')
  },
  {
    role: "assistant",
    content: `Un restaurant nu este despre mâncare. Este despre power positioning. Clientul tău nu plătește pentru friptură - plătește pentru senzația de superioritate pe care i-o oferi când stă la masa ta în loc de masa concurenței. Acum să-ți arăt cum să transformi un restaurant într-un imperiu.

**REALITATEA TA:**
Fine dining în București = 50+ competitori care se luptă pentru aceeași nișă mică de clienți cu bani. Tu ești unul dintre ei. Asta se termină acum.

**PROBLEMA TA REALĂ:**
"Extindere fără risc" este contradictoriu. Vrei să cucerești fără să lupți? Imposibil. DAR poți să minimizezi riscul atacând unde concurența e oarbă.

**STRATEGIA - DARK KITCHEN EMPIRE:**

1️⃣ **BRANDED DELIVERY CONCEPTS** 
Nu deschizi al doilea restaurant. Deschizi 5 branduri de delivery care operează din ACEEAȘI bucătărie:
• "Pasta Boss" - paste premium delivery
• "Burgeria Select" - burgeri gourmet
• "Sushi District" - sushi proaspăt
• "Vegan Lab" - fine dining vegan
• "Steakhouse Express" - friptură la cutie

Clienții nu știu că toate vin din aceeași bucătărie. Ei văd 5 branduri diferite = dominație pe aplicațiile de food delivery.

2️⃣ **DATA WARFARE**
Monitorizează exact ce comandă fiecare client. Ce vrea bucureșteanul la 2 AM? La 1 PM? În weekend? 
Creează meniuri PREDICTIVE: "Știm că vinerea la 20:00 vrei friptură cu vin roșu" → gata pregătită în 12 minute.

3️⃣ **CAPTURE TERRITORY**
Identifică 3 zone în București unde nu ajung restaurantele premium în mai puțin de 45 minute. Deschizi dark kitchen acolo. Delivery în 15 minute. Game over pentru concurență.`,
    timestamp: new Date('2025-02-10T14:21:15')
  },
  {
    role: "user",
    content: "Dar reputația restaurantului fine dining? Nu se dilueaza cu delivery?",
    timestamp: new Date('2025-02-10T14:23:00')
  },
  {
    role: "assistant",
    content: `Întrebare bună. Răspuns simplu: SEPARI brandurile.

**STRATEGIA DE BRANDING - MULTI PERSONA:**

🎩 **"RESTAURANT MAMA" = Fine Dining Experience**
• Păstrezi exclusivitatea totală
• Zero delivery, zero compromis
• Prețuri premium, experiență premium
• Acesta rămâne "sanctuarul" unde vin clienții pentru ocazii speciale

🍕 **BRANDURI DARK KITCHEN = Volume Play**
• Nume complet diferite, identitate vizuală separată
• NIMENI nu știe că sunt conectate cu restaurantul tău
• Target: millennials, GenZ, familii, corporate
• Prețuri accesibile, volume mari, marje OK (35-40%)

**DE CE FUNCȚIONEAZĂ:**
Tesla vinde mașini electrice de lux. Elon Musk nu a făcut "Tesla Delivery Services" - a creat SpaceX, Starlink, Boring Company. 

Tu faci același lucru: brand premium păstrează exclusivitatea, branduri satelit generează cash flow stabil și cuprind piața.

**PLAN EXECUȚIE - 6 LUNI:**

**LUNI 1-2: LABORATOR**
• Testezi 3 concepte de delivery cu meniu limitat
• Faci focus group pe 100 clienți
• Identifici care concept = cea mai mare conversie

**LUNI 3-4: LANSARE STEALTH**
• Lansezi pe Glovo/Tazz sub nume nou
• Marketing zero la început
• Tracking metrics: repeat rate, AOV, review score

**LUNI 5-6: SCALE**
• Conceptul câștigător → deschizi dark kitchen în 2 zone noi
• Automatizezi complet: sistem de comenzi integrat, prep times optimized
• Cash flow pozitiv începe să acopere investiția inițială

**MATEMATICA:**
• Investiție dark kitchen: €30k (echipamente + setup)
• Breakeven: 60-90 zile la 150 comenzi/zi
• Profit net după 6 luni: €8k-12k/lună PER locație

3 locații = €24k-36k profit lunar EXTRA față de restaurantul tău principal.

**RISCUL TĂU REAL:**
Nu extinderea. Stagnarea. Concurența ta pregătește EXACT această strategie chiar acum.

Cine mișcă primul = câștigă piața.`,
    timestamp: new Date('2025-02-10T14:24:30')
  }
];

// Demo conversations pentru IT
const itMessages: Message[] = [
  {
    role: "user",
    content: "Am firmă software development, 8 developeri. Clienții întârzie plățile. Cum îmi cresc cash flow și mă scal la 20+ oameni?",
    timestamp: new Date('2025-01-20T10:15:00')
  },
  {
    role: "assistant",
    content: `Cash flow probleme + scaling = moarte sigură dacă nu acționezi ACUM. Software development e o industrie unde 70% dintre firme mor nu din cauza lipsei de clienți, ci din cauza lipsei de cash când trebuie să plătești salarii.

Ești vulnerabil. Hai să te facem invulnerabil.

**PROBLEMA TA:**
Tu vinzi timp × expertiză. Model defect. Clienții tăi plătesc DUPĂ ce tu ai investit deja sute de ore de muncă. Când ei întârzie, tu intri în criză de lichiditate. Când vrei să scaling la 20 developeri, problema se AMPLIFICA 2.5x.

**SOLUȚIA - INVERSAREA FLUXULUI DE BANI:**

**NIVEL 1 - FIXES IMEDIATE (0-30 zile)**

💰 **PAYMENT TERMS RESTRUCTURE**
Nu mai accepti NET30 sau NET60. Noul standard:
• 50% upfront la semnarea contractului
• 25% la middle milestone
• 25% la final
• Clienți existenti: renegociază cu "discount 10% pentru plată în avans"

📊 **CLIENȚI TIERING**
Clasifică clienții în:
• TIER A: Plătesc la timp, proiecte mari → prioritate maximă
• TIER B: Plătesc cu întârziere 7-15 zile → fee +15%
• TIER C: Plătesc după 30+ zile → REJECTED sau prepayment obligatoriu

**NIVEL 2 - TRANSFORMARE STRUCTURALĂ (30-90 zile)**

🔄 **RETAINER ECONOMY**
Nu mai vinzi proiecte. Vinzi "development capacity" lunar:
• Pachet S: 80h/lună = €6,400 (2 developeri part-time)
• Pachet M: 160h/lună = €12,000 (2 developeri full-time)
• Pachet L: 320h/lună = €22,000 (4 developeri)

Clienții plătesc pe 1 ale fiecărei luni. TU ai cash flow predictibil ÎNAINTE să începi munca.

**NIVEL 3 - DOMINAȚIE (90-180 zile)**

🚀 **PRODUCTIZATION**
Stop cu "custom development" pentru toată lumea. Construiește 2-3 produse SaaS white-label:
• "E-commerce Accelerator" - platformă ready-made cu customizare
• "FinTech Starter Kit" - sistem banking/payment gata făcut
• "Dashboard Pro" - analytics dashboard universal

Vinzi licența + customizare. Cost dezvoltare: ZERO (deja făcută). Profit margin: 80-90%.

**SCALING LA 20 OAMENI - MATEMATICA:**

8 developeri acum × €3,000 salarii = €24,000/lună costuri
20 developeri × €3,000 = €60,000/lună costuri

Trebuie să crești venitul cu €36,000/lună MINIM.

**CUM?**
• 5 clienți retainer Pachet L = €110,000/lună recurent
• 2 proiecte white-label/lună = €30,000/lună
• Total: €140,000/lună venit

Profit net: €140k - €60k salarii - €15k overhead = €65,000/lună

Acum ai PUTERE DE FATĂ.`,
    timestamp: new Date('2025-01-20T10:17:00')
  }
];

// Demo conversations pentru PRODUCȚIE
const productieMessages: Message[] = [
  {
    role: "user",
    content: "Fabrica de mobilier la comandă. Comenzile fluctuează, capital blocat în stocuri. Cum stabilizez business-ul?",
    timestamp: new Date('2025-02-01T16:30:00')
  },
  {
    role: "assistant",
    content: `Producție la comandă cu stocuri mari = contradicție care îți mănâncă profitul. Hai să rezolvăm asta strategic, nu prin "optimizări" cosmetice.

**DIAGNOSTICUL TĂU:**
• Comenzile fluctuează → te temi să refuzi clienti → produci "în avans" → bani blocați în lemn care nu se vinde
• Model de business REACTIV: aștepți comenzi → apoi produci → apoi încasezi
• Vulnerabil la: sezonalitate, clienți indecisi, întârzieri plăți

**STRATEGIA - JIT PRODUCTION + PREDICTIVE INVENTORY:**

**FAZA 1 - KILL THE BLOAT (Lună 1-2)**

📊 **INVENTORY AUDIT BRUTAL**
• Clasifică tot stocul:
  - A: Produse/materiale folosite în 80% din comenzi → PĂSTREAZĂ
  - B: Folosite în 15% din comenzi → REDUCE la jumătate
  - C: Sub 5% utilizare → LIQUIDEAZĂ cu discount 40%

• Rezultat: Eliberezi €40k-80k cash blocat în C items
• Folosești banii să plătești furnizori cu discount pentru plată rapidă (-5-8%)

**FAZA 2 - DEMAND SHAPING (Lună 2-4)**

🎯 **STANDARDIZARE SILENȚIOASĂ**
Nu mai oferi "orice design dorește clientul". Oferi:
• 15 modele de bază STANDARD (90% din componente identice)
• 30+ opțiuni de customizare (finisaje, culori, dimensiuni minore)
• Clientul simte că e custom, TU produci semi-standardizat

**IMPACT:**
• Reduced SKU complexity cu 60%
• Inventory turnover crește de la 38 zile → 18 zile
• Costuri producție scad 25% (economii de scală pe componente)

**FAZA 3 - PREDICTIVE ORDERS (Lună 4-6)**

🔮 **PREORDER SYSTEM + DEPOSIT MANDATORY**
• Site web + Facebook: "Colecția Primăvară 2025 - Precomandă cu 30% discount"
• Clienții plătesc 50% avans → TU știi exact ce să produci
• Materiale cumpărate DUPĂ ce ai cash de la clienți → zero risc stocuri

📈 **DEMAND FORECASTING**
• Tracking istoric comenzi: martie = camere copii, septembrie = birouri home office
• Produci "în lot" pentru luna viitoare bazat pe date
• Oferi discount 10% pentru "comenzi flexibile" = clientul acceptă +7 zile delivery pentru preț mai mic

**MATEMATICA TRANSFORMĂRII:**

**ÎNAINTE:**
• Stocuri: €145,000 (capital mort)
• Cash conversion cycle: 58 zile
• Profit margin: 12%

**DUPĂ:**
• Stocuri: €65,000 (55% reducere)
• Capital eliberat: €80,000 → investiți în marketing + echipamente CNC
• Cash conversion cycle: 22 zile
• Profit margin: 18% (economii producție + preț premium pentru "semi-custom")

**NEXT LEVEL - FURNITURE AS A SERVICE:**

💡 Modelul viitor: Nu vinzi mobilier. Vinzi "office furniture subscription":
• €299/lună pentru pachet complet birou
• După 36 luni = clientul devine proprietar SAU upgrade la mobilier nou
• TU ai cash flow lunar recurent + asset depreciation controlat

Asta e cum transformi o fabrică în SaaS.`,
    timestamp: new Date('2025-02-01T16:32:30')
  }
];

// Demo conversations pentru COMERȚ
const comertMessages: Message[] = [
  {
    role: "user",
    content: "Boutique fashion retail. Stocuri vechi nu se vând, chiria mă omoară. E-commerce mic. Cum supraviețuiesc?",
    timestamp: new Date('2025-02-05T11:00:00')
  },
  {
    role: "assistant",
    content: `"Supraviețuire" e cuvânt pentru victime. Tu nu vrei să supraviețuiești, vrei să DOMINEZI. Dar mai întâi trebuie să oprim hemoragia de cash și să transformăm stocurile vechi din pasiv în activ.

**CRIZA TA ACTUALĂ:**
• Stocuri vechi = capital mort + spațiu de depozitare ocupat
• Chirie retail fizic = €1,500-3,000/lună pentru trafic în scădere
• E-commerce "mic" = nu generează suficient să acopere fixul

Ai 2 opțiuni: restructurare agresivă SAU faliment în 12-18 luni. Aleg restructurarea.

**OPERAȚIUNEA SALVARE - 90 ZILE:**

**SĂPTĂMÂNA 1-2: STOP THE BLEEDING**

💸 **LIQUIDARE STOCURI VECHI - WIPE THE SLATE**
• Identifică TOT ce are 6+ luni în stoc
• Flash sale BRUTAL: -60-70% discount
• Obiectiv: cash imediat, nu profit
• Canale: Instagram flash sale 48h, site, grup Facebook privat "VIP early access"

**DE CE?**
Stoc de €10,000 care nu se vinde în 6 luni = PIERDERE. 
Același stoc vândut la -70% = €3,000 cash azi > €0 peste 6 luni.

**SĂPTĂMÂNA 3-4: RENEGOCIERE CHIRIE**

🏢 **LANDLORD NEGOTIATION - HARD TALK**
Opțiuni pentru proprietar:
1. Reduci chiria cu 30% + % din vânzări
2. Mă mut și găsești alt chiriaș în 6 luni (piață slabă = șansă mică)
3. Transformăm magazinul în "showroom" mini (50% din spațiu) + returnez restul

Proprietarii urăsc spații goale. Negociază DUR.

**LUNA 2-3: E-COMMERCE BLITZ**

🚀 **TRANSFORMARE DIGITALĂ AGRESIVĂ**

**STOP "site de prezentare". START "mașină de vânzări":**

1️⃣ **INSTAGRAM/TIKTOK FIRST**
• 3 postări/zi: reels cu styling tips
• Colaborări cu 10 micro-influenceri (3k-15k followers) - barter, nu cash
• Live shopping sessions 2x/săptămână
• Target: Gen Z + millennials care cumpără IMPULSIV online

2️⃣ **RETENTION > ACQUISITION**
• Email marketing agresiv: 3 mailuri/săptămână
• SMS pentru clienți vechi: "Stii că te iubim, 25% pentru tine azi"
• Program loialitate: Buy 3 items → 4th GRATUIT

3️⃣ **CONTENT = PRODUCT**
Nu vinzi "haine". Vinzi "personal styling service":
• Fiecare client primește "style guide PDF" personalizat
• Virtual styling session 15 min (Zoom/WhatsApp) = client se simte VIP
• "Capsule wardrobe curation" = 5 piese care merg împreună → AOV creștere 40%

**LUNA 3: PIVOTARE MODEL BUSINESS**

🔄 **DE LA RETAIL LA STYLING SERVICE**

Noul pitch:
"Nu mai vindem doar haine. Suntem styling consultancy care SE ÎNTÂMPLĂ să vândă și produse."

**PACHETE NOI:**
• BASIC: €49 - Style consultation + 3 outfit recommendations
• PREMIUM: €149 - Consultation + 5 outfits + video styling tips
• VIP: €299/lună subscription - Full wardrobe refresh quarterly + styling continuu

Produsele pe care le vinzi = commission, nu stoc propriu. Devii CURATOR, nu retailer.

**MAGAZIN FIZIC → MICRO SHOWROOM + ATELIER STYLING**

**TRANSFORMAREA FINALĂ:**

**ERA VECHE:**
• 100m² magazin cu stocuri
• Chirie €2,500/lună
• Vânzări €15k/lună
• Profit: €800/lună (5%)

**ERA NOUĂ:**
• 30m² showroom + styling studio
• Chirie €900/lună (renegociată)
• E-commerce: €25k/lună
• Styling services: €8k/lună
• Total revenue: €33k/lună
• Profit: €8,500/lună (26%)

Fashion retail nu moare. Retail PROST moare.
Tu nu ești prost. Tu doar nu aveai strategia potrivită.

Acum ai.`,
    timestamp: new Date('2025-02-05T11:03:00')
  }
];

const industries: IndustryDemo[] = [
  { 
    id: 'transport', 
    name: 'Transport Rutier', 
    icon: Truck, 
    color: 'blue',
    companyName: 'SC RAPID TRANS SRL',
    messages: transportMessages
  },
  { 
    id: 'alimentara', 
    name: 'Restaurant / HORECA', 
    icon: UtensilsCrossed, 
    color: 'orange',
    companyName: 'SC GUSTURI URBANE SRL',
    messages: restaurantMessages
  },
  { 
    id: 'it', 
    name: 'Servicii IT / Software', 
    icon: Code, 
    color: 'purple',
    companyName: 'SC DIGITAL SOLUTIONS SRL',
    messages: itMessages
  },
  { 
    id: 'productie', 
    name: 'Producție / Fabricație', 
    icon: Factory, 
    color: 'green',
    companyName: 'SC MOBILIER ELEGANT SRL',
    messages: productieMessages
  },
  { 
    id: 'comert', 
    name: 'Comerț / Retail', 
    icon: ShoppingBag, 
    color: 'pink',
    companyName: 'SC FASHION BOUTIQUE SRL',
    messages: comertMessages
  },
];

export const IndustryDemos = () => {
  const [selectedIndustry, setSelectedIndustry] = useState(industries[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();
  const { isAdmin, isLoading } = useUserRole();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedIndustry]);

  const handleTTS = async () => {
    if (isSpeaking) {
      // Stop current audio
      const audioElements = document.querySelectorAll('audio.tts-audio');
      audioElements.forEach(el => {
        (el as HTMLAudioElement).pause();
        el.remove();
      });
      setIsSpeaking(false);
      return;
    }

    // Preferăm un text scurt pentru demo (bun pentru Shorts)
    const assistantText = selectedIndustry.messages
      .filter(m => m.role === 'assistant')
      .map(m => `Yana: ${m.content}`)
      .join('\n\n');

    // Curățăm markdown-ul pentru TTS
    const cleaned = assistantText
      .replace(/\*\*/g, '')
      .replace(/^[#>\-]+\s*/gm, '')
      .replace(/`/g, '')
      .trim();

    // 1) Țintim un text scurt pentru redare (≈ 60-90 sec)
    const TARGET_LEN = 1500; // aproximativ 60-90 secunde
    let textToSpeak = cleaned.slice(0, TARGET_LEN);

    // 2) Siguranță pentru limita maximă OpenAI TTS (4096)
    const MAX_TTS_LENGTH = 4096;
    if (textToSpeak.length > MAX_TTS_LENGTH) {
      textToSpeak = textToSpeak.substring(0, MAX_TTS_LENGTH - 100);
    }

    if (cleaned.length > TARGET_LEN) {
      toast({
        title: "Conversație condensată",
        description: "Am scurtat textul pentru o redare clară și rapidă.",
        duration: 3000
      });
    }

    try {
      setIsSpeaking(true);
      
      const tryVoice = async (voice: string) => {
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { 
            text: textToSpeak,
            voice
          }
        });
        if (error) return null;
        return data?.audioContent as string | null;
      };

      // Încercăm cu "nova", apoi fallback pe "alloy"
      let audioB64 = await tryVoice('nova');
      if (!audioB64) audioB64 = await tryVoice('alloy');

      if (!audioB64) throw new Error('TTS failed for both voices');

      const audio = new Audio(`data:audio/mp3;base64,${audioB64}`);
      audio.className = 'tts-audio';
      audio.onended = () => {
        setIsSpeaking(false);
        audio.remove();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        audio.remove();
        toast({ title: 'Eroare TTS', description: 'Nu s-a putut reda audio', variant: 'destructive' });
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      toast({
        title: "Eroare TTS",
        description: "Nu s-a putut genera vocea",
        variant: "destructive"
      });
    }
  };

  // Redirect non-admins
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main chat area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="container mx-auto px-4 py-3">
            {/* Admin Banner */}
            <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-orange-500/20">
                    <Crown className="h-3 w-3 mr-1" />
                    DEMO MODE - ADMIN ONLY
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Conversații demo pentru prezentări clienți pe industrii diferite
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/app')}>
                  Înapoi
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/app')}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Yana Strategica - Demo Industrii</h1>
                <p className="text-sm text-muted-foreground">
                  Consultant AI Strategic - Conversații Demo
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-64">
                  <Select 
                    value={selectedIndustry.id} 
                    onValueChange={(value) => {
                      const industry = industries.find(i => i.id === value);
                      if (industry) setSelectedIndustry(industry);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => {
                        const Icon = industry.icon;
                        return (
                          <SelectItem key={industry.id} value={industry.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {industry.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleTTS}
                  variant={isSpeaking ? "destructive" : "outline"}
                  size="icon"
                  title={isSpeaking ? "Oprește" : "Citește conversația"}
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="container mx-auto max-w-4xl space-y-4">
            {/* Welcome Card */}
            <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-accent/5">
              <Brain className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h2 className="text-xl font-semibold mb-2">
                Demo: {selectedIndustry.companyName}
              </h2>
              <Badge variant="outline" className="mb-2">
                {selectedIndustry.name}
              </Badge>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Conversație strategică demo pentru prezentări către clienți din industria selectată
              </p>
            </Card>

            {/* Messages */}
            {selectedIndustry.messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[80%]">
                  <Card
                    className={`p-4 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-xs mt-2 ${
                      msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {msg.timestamp.toLocaleTimeString("ro-RO", { 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer info */}
        <div className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-4">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="text-xs text-muted-foreground">
              🎭 Acesta este un demo read-only. Conversațiile sunt pre-generate pentru demonstrații către clienți.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
