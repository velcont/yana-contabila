import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { useState } from 'react';

export const YanaStrategicaTutorial = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Card className="p-6 mb-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-bold">Cum să folosești Yana Strategica eficient</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </Button>
      </div>

      <div className="space-y-4 text-sm">
        <div className="grid md:grid-cols-2 gap-4">
          {/* DO's */}
          <div className="space-y-3">
            <h4 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              ✅ Fă asta pentru rezultate bune:
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex gap-2">
                <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                <span><strong>Dă context complet:</strong> "Sunt în industria X, am Y angajați, cifră de afaceri Z lei/lună, cheltuieli W lei/lună"</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                <span><strong>Specifică problema exact:</strong> "DSO-ul meu e 90 zile, vreau să-l reduc la 45 fără să pierd clienți"</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                <span><strong>Menționează constrângeri:</strong> "Buget maxim 10.000 lei, nu pot angaja, termenul e 3 luni"</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                <span><strong>Dă detalii despre concurență:</strong> "Concurența mea oferă preț X, eu oferă Y, ei au Z avantaj"</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                <span><strong>Întreabă specific:</strong> "Care sunt 3 strategii concrete de pricing agresiv pentru industria mea?"</span>
              </li>
            </ul>
          </div>

          {/* DON'Ts */}
          <div className="space-y-3">
            <h4 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              ❌ Evită asta (răspunsuri slabe):
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex gap-2">
                <span className="text-red-600 dark:text-red-400 font-bold">•</span>
                <span><strong>Întrebări vagi:</strong> "Cum fac profit?" → prea general, răspuns generic</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 dark:text-red-400 font-bold">•</span>
                <span><strong>Fără cifre:</strong> "Am cheltuieli mari" → cât exact? % din venituri?</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 dark:text-red-400 font-bold">•</span>
                <span><strong>Fără context:</strong> "Vreau strategie de marketing" → pentru ce industrie? buget?</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 dark:text-red-400 font-bold">•</span>
                <span><strong>Așteptări nerealiste:</strong> "Vreau să triplez profitul în 1 lună" → imposibil fără risc uriaș</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 dark:text-red-400 font-bold">•</span>
                <span><strong>Decizii finale fără consultanți:</strong> AI-ul NU înlocuiește experți umani!</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Example */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-300 dark:border-blue-700">
          <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">📝 Exemplu de întrebare BUNĂ:</h4>
          <p className="text-xs italic text-blue-900 dark:text-blue-100">
            "Am un restaurant în București, 15 angajați, 50.000 lei/lună venituri, 45.000 lei cheltuieli (90% marja operațională), 
            DSO 60 zile. Concurența oferă 10% discount la livrări, eu nu. Vreau să cresc profitul net cu 20% în 6 luni 
            fără să scad calitatea. Ce strategii de pricing și optimizare costuri ai pentru mine? Buget maxim implementare: 15.000 lei."
          </p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-400 dark:border-yellow-600">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <p className="text-xs text-yellow-900 dark:text-yellow-100">
              <strong>Memento:</strong> Yana Strategica e un instrument de brainstorming, NU un garant de succes. 
              Testează sfaturile pe scară mică, consultă profesioniști pentru decizii mari, și documentează ce merge/nu merge.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
