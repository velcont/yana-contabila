
INSERT INTO public.yana_ground_truth (category, subcategory, fact_key, fact_value, legal_source, effective_from, effective_until, romania_specific, verified_by, last_verified_at, notes)
VALUES 
(
  'fiscal',
  'situatii_financiare',
  'termen_depunere_situatii_financiare_general_2025',
  '"2 iunie 2026"'::jsonb,
  'Legea contabilității nr. 82/1991 - 150 zile de la finalul anului',
  '2026-01-01',
  '2026-06-02',
  true,
  'admin',
  now(),
  'Termenul general de depunere a situațiilor financiare aferente exercițiului 2025 este de 150 de zile de la finalul anului anterior. Deoarece termenul cade într-o zi nelucrătoare, se prelungește până la 2 iunie 2026.'
),
(
  'fiscal',
  'microintreprinderi',
  'termen_depunere_situatii_financiare_micro_2026',
  '"31 martie 2026"'::jsonb,
  'Art.48 alin.(2) Cod Fiscal, OUG nr. 8/2026, art.10 alin.(3) OUG nr. 8/2026',
  '2026-01-01',
  '2026-12-31',
  true,
  'admin',
  now(),
  'Pentru aplicarea regimului de microîntreprindere în anul fiscal 2026, situațiile financiare aferente exercițiului 2025 trebuie depuse până la 31 martie 2026 inclusiv (art.48 alin.2 Cod Fiscal, introdus prin OUG 8/2026). Condiția de la art.47 alin.(1) lit.i) se verifică la 31 decembrie 2025 dar se consideră îndeplinită dacă depunerea se face până la 31 martie 2026. IMPORTANT: Data de 2 iunie este termenul general (Legea contabilității), dar pentru accesul la regimul micro, termenul special este 31 martie 2026.'
),
(
  'fiscal',
  'microintreprinderi',
  'sanctiune_nedepunere_situatii_financiare_micro_2026',
  '"trecere la impozit pe profit din trimestrul neîndeplinirii condiției"'::jsonb,
  'Art.52 alin.(2) Cod Fiscal, modificat prin OUG nr. 8/2026 pct.21',
  '2026-01-01',
  '2026-12-31',
  true,
  'admin',
  now(),
  'Dacă o microîntreprindere nu a depus în termen situațiile financiare anuale pentru exercițiul financiar precedent, datorează impozit pe profit începând cu trimestrul în care nu mai este îndeplinită această condiție. Condiția depunerii la termen a fost introdusă inițial prin OUG 115/2023 pct.29 (art.47 lit.i) pentru anul 2024, aplicabilă inițial bilanțurilor restante aferente exercițiilor anterioare anului 2023.'
);
