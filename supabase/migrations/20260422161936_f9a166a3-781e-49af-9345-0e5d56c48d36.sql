-- Reset gaps to allow re-spawning after tester schema fix
UPDATE public.yana_capability_gaps
SET status = 'open', updated_at = now()
WHERE status = 'in_progress'
  AND id IN (
    'b3d65005-ec9b-461c-bcd5-ffe93fc5526f',
    '18f052ec-7d17-4eae-a40b-d4404690aa1a',
    'eac2cfda-f0af-4952-a198-8960f28fbab0',
    '1c54d5e3-70e3-476f-8a00-68129540d7b2',
    '63a0da57-d67b-4735-985c-dc58de91d903',
    '1dc82def-b320-4607-984c-8b1f2fba1052'
  );

-- Also archive old rejected proposals so UI shows fresh state
UPDATE public.yana_self_proposals
SET status = 'archived'
WHERE status = 'rejected'
  AND rejection_reason LIKE '%agent_name%';