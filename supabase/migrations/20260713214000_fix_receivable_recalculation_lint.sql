create or replace function public.recalculate_receivable_status(receivable_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  open_total numeric(12,2);
  entry_total numeric(12,2);
  has_overdue boolean;
  has_open boolean;
begin
  select
    coalesce(sum(amount) filter (where status in ('locked', 'pending', 'overdue')), 0),
    coalesce(sum(amount) filter (where lower(description) like '%entrada%' and status <> 'cancelled'), 0),
    coalesce(bool_or(status = 'overdue'), false),
    coalesce(bool_or(status in ('locked', 'pending', 'overdue')), false)
  into open_total, entry_total, has_overdue, has_open
  from public.accounts_receivable_installments
  where receivable_id = receivable_uuid;

  update public.accounts_receivable
  set entry_amount = entry_total,
      remaining_amount = open_total,
      status = case when has_overdue then 'overdue' when has_open then 'pending' else 'received' end,
      updated_at = now()
  where id = receivable_uuid;
end;
$$;
