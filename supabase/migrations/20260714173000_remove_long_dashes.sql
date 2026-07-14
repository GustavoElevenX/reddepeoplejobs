update public.accounts_receivable_installments
set description = replace(description, ' ' || chr(8212) || ' ', ', ')
where description like '%' || chr(8212) || '%';
