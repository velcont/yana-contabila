-- Reset gaps blocked by tester schema bug; old proposals stay rejected for audit
UPDATE public.yana_capability_gaps
SET status = 'open'
WHERE status = 'in_progress'
  AND id IN (
    SELECT unnest(target_gap_ids)
    FROM public.yana_self_proposals
    WHERE status = 'rejected'
      AND rejection_reason LIKE 'Agent creation failed:%'
  );
