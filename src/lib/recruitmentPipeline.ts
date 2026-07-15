import { supabase } from './supabase';
import type {
  Application,
  ApplicationDisqualification,
  ApplicationHire,
  ApplicationStage,
  ApplicationStageHistory,
  ApplicationTestAssignment,
  BulkMutationResult,
  CandidateFilters,
  CandidateScreening,
  CandidateWorkspace,
  InternalInterview,
  Job,
  JobStageSlaSetting,
  JobTest,
  MoveApplicationStagePayload,
  ReorderApplicationPayload,
  ProcessDocument,
  ProcessProjectLink,
  ProcessStageHistoryItem,
} from '../types';

type SupabaseErrorLike = { message?: string; details?: string; hint?: string };

function readableError(error: unknown) {
  const candidate = error as SupabaseErrorLike | null;
  return candidate?.message || candidate?.details || candidate?.hint || 'Não foi possível concluir a operação.';
}

function throwIfError(error: unknown) {
  if (error) throw new Error(readableError(error));
}

export async function listProcessCandidates(
  jobId: string,
  filters: CandidateFilters = {},
  page = 1,
  pageSize = 50,
) {
  const from = Math.max(page - 1, 0) * pageSize;
  let query = supabase
    .from('applications')
    .select('*, companies(id,name,slug), jobs(id,title,slug)', { count: 'exact' })
    .eq('job_id', jobId);

  if (filters.search) {
    const search = filters.search.replaceAll(',', ' ').trim();
    query = query.or(`candidate_name.ilike.%${search}%,candidate_email.ilike.%${search}%,candidate_city.ilike.%${search}%`);
  }
  if (filters.stages?.length) query = query.in('stage', filters.stages);
  if (filters.scoreMin !== undefined) query = query.gte('ai_match_score', filters.scoreMin);
  if (filters.scoreMax !== undefined) query = query.lte('ai_match_score', filters.scoreMax);
  if (filters.resumeAnalysisStatus) query = query.eq('resume_analysis_status', filters.resumeAnalysisStatus);
  if (filters.city) query = query.ilike('candidate_city', `%${filters.city}%`);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.tags?.length) query = query.contains('tags', filters.tags);
  if (filters.newOnly) query = query.eq('is_new', true);
  if (filters.appliedFrom) query = query.gte('created_at', filters.appliedFrom);
  if (filters.appliedTo) query = query.lte('created_at', `${filters.appliedTo}T23:59:59.999Z`);

  switch (filters.sort) {
    case 'score_asc': query = query.order('ai_match_score', { ascending: true, nullsFirst: false }); break;
    case 'oldest': query = query.order('created_at', { ascending: true }); break;
    case 'stale': query = query.order('updated_at', { ascending: true }); break;
    case 'name': query = query.order('candidate_name', { ascending: true }); break;
    case 'newest': query = query.order('created_at', { ascending: false }); break;
    default: query = query.order('ai_match_score', { ascending: false, nullsFirst: false });
  }

  const { data, error, count } = await query.range(from, from + pageSize - 1);
  throwIfError(error);
  const items = (data ?? []).map((row) => {
    const record = row as unknown as Application & {
      companies?: Application['company'];
      jobs?: Application['job'];
    };
    const { companies, jobs, ...application } = record;
    return { ...application, company: companies, job: jobs } as Application;
  });
  return { items, total: count ?? items.length, page, pageSize };
}

export async function getProcessCandidateCounts(jobId: string) {
  const { data, error } = await supabase.from('applications').select('stage,is_new').eq('job_id', jobId);
  throwIfError(error);
  const counts: Record<ApplicationStage | 'total' | 'new', number> = {
    total: 0,
    new: 0,
    qualificacao: 0,
    testes: 0,
    entrevista: 0,
    finalistas: 0,
    contratacao: 0,
    desclassificados: 0,
  };
  (data ?? []).forEach((row) => {
    const item = row as { stage: ApplicationStage; is_new: boolean };
    counts.total += 1;
    counts[item.stage] += 1;
    if (item.is_new) counts.new += 1;
  });
  return counts;
}

export async function moveApplicationStage(payload: MoveApplicationStagePayload) {
  const { data, error } = await supabase.rpc('move_application_stage', {
    application_uuid: payload.applicationId,
    target_stage: payload.targetStage,
    target_order: payload.targetOrder,
    action_reason: payload.reason ?? null,
    action_metadata: payload.metadata ?? { source: 'candidate_management' },
  });
  throwIfError(error);
  return data as unknown as Application;
}

export async function reorderApplications(payload: ReorderApplicationPayload[]) {
  if (!payload.length) return 0;
  const { data, error } = await supabase.rpc('reorder_applications', {
    application_positions: payload,
  });
  throwIfError(error);
  return Number(data ?? 0);
}

export async function bulkMoveApplications(
  applications: Pick<Application, 'id'>[],
  targetStage: ApplicationStage,
  reason?: string,
): Promise<BulkMutationResult> {
  const result: BulkMutationResult = { processed: applications.length, completed: 0, failed: [] };
  for (const [index, application] of applications.entries()) {
    try {
      await moveApplicationStage({
        applicationId: application.id,
        targetStage,
        targetOrder: index,
        reason,
        metadata: { source: 'bulk_action', bulk: true },
      });
      result.completed += 1;
    } catch (error) {
      result.failed.push({ applicationId: application.id, reason: readableError(error) });
    }
  }
  return result;
}

export async function listJobTests(jobId: string) {
  const { data, error } = await supabase.from('job_tests').select('*').eq('job_id', jobId).order('sort_order');
  throwIfError(error);
  return (data ?? []) as JobTest[];
}

export async function upsertJobTest(
  payload: Pick<JobTest, 'job_id' | 'name' | 'test_type'> & Partial<Omit<JobTest, 'job_id' | 'name' | 'test_type'>>,
) {
  const { data: job, error: jobError } = await supabase.from('jobs').select('franchise_id').eq('id', payload.job_id).single();
  throwIfError(jobError);
  if (!job) throw new Error('Processo seletivo não encontrado.');
  const timestamp = new Date().toISOString();
  const values = { ...payload, franchise_id: payload.franchise_id ?? job.franchise_id, updated_at: timestamp };
  const response = payload.id
    ? await supabase.from('job_tests').update(values).eq('id', payload.id).select('*').single()
    : await supabase.from('job_tests').insert(values).select('*').single();
  throwIfError(response.error);
  return response.data as JobTest;
}

export async function assignTestsToApplication(applicationId: string) {
  const { data: application, error: applicationError } = await supabase
    .from('applications').select('job_id,franchise_id').eq('id', applicationId).single();
  throwIfError(applicationError);
  if (!application) throw new Error('Candidatura não encontrada.');
  const tests = await listJobTests(application.job_id);
  const rows = tests.filter((test) => test.is_active).map((test) => ({
    application_id: applicationId,
    job_test_id: test.id,
    job_id: application.job_id,
    franchise_id: application.franchise_id,
    status: 'pending',
  }));
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from('application_test_assignments')
    .upsert(rows, { onConflict: 'application_id,job_test_id', ignoreDuplicates: true })
    .select('*, job_tests(*)');
  throwIfError(error);
  return (data ?? []).map((row) => {
    const item = row as unknown as ApplicationTestAssignment & { job_tests?: JobTest };
    const { job_tests, ...assignment } = item;
    return { ...assignment, job_test: job_tests };
  });
}

export async function updateTestResult(
  payload: Pick<ApplicationTestAssignment, 'id' | 'status'> & Partial<ApplicationTestAssignment>,
) {
  const timestamp = new Date().toISOString();
  const values = {
    status: payload.status,
    score: payload.score,
    max_score: payload.max_score,
    result: payload.result,
    notes: payload.notes,
    external_result_url: payload.external_result_url,
    attachment_url: payload.attachment_url,
    completed_at: ['completed', 'approved', 'failed'].includes(payload.status) ? timestamp : payload.completed_at,
    waived_at: payload.status === 'waived' ? timestamp : payload.waived_at,
    waiver_reason: payload.waiver_reason,
    updated_at: timestamp,
  };
  const { data, error } = await supabase.from('application_test_assignments').update(values).eq('id', payload.id).select('*').single();
  throwIfError(error);
  return data as ApplicationTestAssignment;
}

export async function waiveResumeAnalysis(applicationId: string, reason: string) {
  if (!reason.trim()) throw new Error('Informe a justificativa para dispensar a análise do currículo.');
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');
  const { data, error } = await supabase.from('applications').update({
    resume_analysis_waived_at: new Date().toISOString(),
    resume_analysis_waiver_reason: reason.trim(),
    resume_analysis_waived_by: auth.user.id,
    updated_at: new Date().toISOString(),
  }).eq('id', applicationId).select('*').single();
  throwIfError(error);
  return data as Application;
}

async function getApplicationScope(applicationId: string) {
  const { data: application, error } = await supabase
    .from('applications').select('id,job_id,franchise_id').eq('id', applicationId).single();
  throwIfError(error);
  if (!application) throw new Error('Candidatura não encontrada.');
  const { data: project, error: projectError } = await supabase
    .from('projects').select('id').eq('job_id', application.job_id).maybeSingle();
  throwIfError(projectError);
  return { application, projectId: project?.id ?? null };
}

export async function getOrCreateCandidateScreening(applicationId: string) {
  const { data: existing, error: existingError } = await supabase
    .from('candidate_screenings').select('*').eq('application_id', applicationId).maybeSingle();
  throwIfError(existingError);
  if (existing) return existing as CandidateScreening;
  const { application, projectId } = await getApplicationScope(applicationId);
  const { data, error } = await supabase.from('candidate_screenings').insert({
    application_id: application.id,
    job_id: application.job_id,
    franchise_id: application.franchise_id,
    project_id: projectId,
  }).select('*').single();
  throwIfError(error);
  return data as CandidateScreening;
}

export async function completeCandidateScreening(
  payload: Pick<CandidateScreening, 'id' | 'status' | 'mandatory_requirements_confirmed'> &
    Partial<CandidateScreening>,
) {
  if (payload.status === 'rejected' && !payload.rejection_reason?.trim()) {
    throw new Error('Informe o motivo da reprovação.');
  }
  const { data: auth } = await supabase.auth.getUser();
  const completed = payload.status !== 'draft';
  const { data, error } = await supabase.from('candidate_screenings').update({
    status: payload.status,
    answers: payload.answers ?? {},
    mandatory_requirements_confirmed: payload.mandatory_requirements_confirmed,
    salary_compatible: payload.salary_compatible,
    availability_compatible: payload.availability_compatible,
    location_compatible: payload.location_compatible,
    technical_score: payload.technical_score,
    behavioral_score: payload.behavioral_score,
    recruiter_notes: payload.recruiter_notes ?? '',
    rejection_reason: payload.rejection_reason,
    completed_by: completed ? auth.user?.id : null,
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', payload.id).select('*').single();
  throwIfError(error);
  return data as CandidateScreening;
}

export async function getOrCreateInternalInterview(applicationId: string) {
  const { data: existing, error: existingError } = await supabase
    .from('internal_interviews').select('*').eq('application_id', applicationId).maybeSingle();
  throwIfError(existingError);
  if (existing) return existing as InternalInterview;
  const { application, projectId } = await getApplicationScope(applicationId);
  const { data, error } = await supabase.from('internal_interviews').insert({
    application_id: application.id,
    job_id: application.job_id,
    franchise_id: application.franchise_id,
    project_id: projectId,
  }).select('*').single();
  throwIfError(error);
  return data as InternalInterview;
}

export async function completeInternalInterview(payload: Pick<InternalInterview, 'id'> & Partial<InternalInterview>) {
  if (!payload.recommendation || !payload.conclusion?.trim()) {
    throw new Error('Preencha a conclusão e a recomendação da entrevista.');
  }
  const { data, error } = await supabase.from('internal_interviews').update({
    ...payload,
    status: 'completed',
    interviewed_at: payload.interviewed_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', payload.id).select('*').single();
  throwIfError(error);
  return data as InternalInterview;
}

export async function scheduleInternalInterview(applicationId: string, scheduledAt: string) {
  if (!scheduledAt) throw new Error('Informe a data e o horÃ¡rio da entrevista.');
  const interview = await getOrCreateInternalInterview(applicationId);
  const { data, error } = await supabase.from('internal_interviews').update({
    status: 'scheduled',
    scheduled_at: scheduledAt,
    updated_at: new Date().toISOString(),
  }).eq('id', interview.id).select('*').single();
  throwIfError(error);
  return data as InternalInterview;
}

export async function listProcessProjectLinks(job: Pick<Job, 'id' | 'company_id'>) {
  const [linkedResult, availableResult] = await Promise.all([
    supabase.from('projects').select('id,franchise_id,client_id,job_id,title,stage').eq('job_id', job.id),
    supabase.from('projects').select('id,franchise_id,client_id,job_id,title,stage')
      .eq('client_id', job.company_id).is('job_id', null).order('created_at'),
  ]);
  throwIfError(linkedResult.error);
  throwIfError(availableResult.error);
  return {
    linked: (linkedResult.data?.[0] ?? null) as ProcessProjectLink | null,
    available: (availableResult.data ?? []) as ProcessProjectLink[],
  };
}

export async function linkProjectToJob(projectId: string, jobId: string) {
  const { data, error } = await supabase.rpc('link_project_to_job', {
    project_uuid: projectId,
    job_uuid: jobId,
  });
  throwIfError(error);
  return data as unknown as ProcessProjectLink;
}

export async function linkSingleAvailableProjectToJob(job: Pick<Job, 'id' | 'company_id'>) {
  const options = await listProcessProjectLinks(job);
  if (options.linked || options.available.length !== 1) return options.linked;
  return linkProjectToJob(options.available[0].id, job.id);
}

export async function prepareCandidateFinalist(applicationId: string, opinion = '') {
  const { application, projectId } = await getApplicationScope(applicationId);
  if (!projectId) throw new Error('Vincule um projeto ao processo antes de preparar o finalista.');
  const { data, error } = await supabase.from('finalists').upsert({
    franchise_id: application.franchise_id,
    project_id: projectId,
    application_id: applicationId,
    status: 'draft',
    franchise_opinion: opinion.trim() || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id,application_id' }).select('*').single();
  throwIfError(error);
  return data as CandidateWorkspace['finalist'];
}

export async function generateCandidateFinalistReport(projectId: string, applicationId: string) {
  const { data, error } = await supabase.functions.invoke('generate-finalist-report', { body: { projectId, applicationId } });
  throwIfError(error);
  return data as { finalist: CandidateWorkspace['finalist'] };
}

export async function saveCandidateFinalistReport(finalistId: string, report: string, approve = false) {
  if (!report.trim()) throw new Error('O parecer do finalista não pode ficar vazio.');
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('finalists').update({
    ai_report: report.trim(),
    ai_report_status: approve ? 'approved' : 'generated',
    franchise_approved_at: approve ? new Date().toISOString() : null,
    franchise_approved_by: approve ? auth.user?.id : null,
    updated_at: new Date().toISOString(),
  }).eq('id', finalistId).select('*').single();
  throwIfError(error);
  return data as CandidateWorkspace['finalist'];
}

export async function listProcessDocuments(jobId: string) {
  const { data, error } = await supabase.from('documents').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []) as ProcessDocument[];
}

export async function createProcessDocument(payload: Omit<ProcessDocument, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('documents').insert(payload).select('*').single();
  throwIfError(error);
  return data as ProcessDocument;
}

export async function listProcessStageHistory(jobId: string) {
  const { data, error } = await supabase
    .from('application_stage_history')
    .select('*, applications!inner(id,candidate_name,job_id)')
    .eq('applications.job_id', jobId)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map((row) => {
    const item = row as unknown as ProcessStageHistoryItem & { applications?: ProcessStageHistoryItem['application'] };
    const { applications, ...history } = item;
    return { ...history, application: applications } as ProcessStageHistoryItem;
  });
}

export async function listDisqualifiedApplications(jobId: string, search = '') {
  let query = supabase
    .from('application_disqualifications')
    .select('*, applications(*)')
    .eq('job_id', jobId)
    .order('disqualified_at', { ascending: false });
  if (search) query = query.ilike('applications.candidate_name', `%${search}%`);
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []).map((row) => {
    const item = row as unknown as ApplicationDisqualification & { applications?: Application };
    const { applications, ...event } = item;
    return { ...event, application: applications } as ApplicationDisqualification;
  });
}

export async function restoreDisqualifiedApplication(payload: { applicationId: string; reason: string }) {
  const { data, error } = await supabase
    .from('application_disqualifications')
    .select('from_stage')
    .eq('application_id', payload.applicationId)
    .is('restored_at', null)
    .order('disqualified_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  if (!data) throw new Error('Não foi encontrada uma desclassificação ativa.');
  return moveApplicationStage({
    applicationId: payload.applicationId,
    targetStage: data.from_stage as ApplicationStage,
    targetOrder: 0,
    reason: payload.reason,
    metadata: { source: 'restore_disqualification', restored: true },
  });
}

export async function listHiredApplications(jobId: string, status?: ApplicationHire['admission_status']) {
  let query = supabase.from('application_hires').select('*, applications(*)').eq('job_id', jobId).order('approved_at', { ascending: false });
  if (status) query = query.eq('admission_status', status);
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []).map((row) => {
    const item = row as unknown as ApplicationHire & { applications?: Application };
    const { applications, ...hire } = item;
    return { ...hire, application: applications } as ApplicationHire;
  });
}

export async function registerApplicationHire(
  payload: Pick<ApplicationHire, 'application_id' | 'job_id' | 'company_id' | 'admission_status'> & Partial<ApplicationHire>,
) {
  const { data, error } = await supabase
    .from('application_hires')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'application_id' })
    .select('*').single();
  throwIfError(error);
  return data as ApplicationHire;
}

export async function listJobStageSlaSettings(jobId: string) {
  const { data, error } = await supabase.from('job_stage_sla_settings').select('*').eq('job_id', jobId).order('stage');
  throwIfError(error);
  return (data ?? []) as JobStageSlaSetting[];
}

export async function upsertJobStageSlaSettings(settings: Omit<JobStageSlaSetting, 'id' | 'created_at' | 'updated_at'>[]) {
  if (!settings.length) return [];
  const { data, error } = await supabase
    .from('job_stage_sla_settings')
    .upsert(settings.map((setting) => ({ ...setting, updated_at: new Date().toISOString() })), { onConflict: 'job_id,stage' })
    .select('*');
  throwIfError(error);
  return (data ?? []) as JobStageSlaSetting[];
}

export async function getCandidateWorkspace(applicationId: string): Promise<CandidateWorkspace> {
  const [applicationResult, screeningResult, interviewResult, testsResult, disqualificationsResult, hireResult, historyResult, notesResult, finalistResult] = await Promise.all([
    supabase.from('applications').select('*').eq('id', applicationId).single(),
    supabase.from('candidate_screenings').select('*').eq('application_id', applicationId).maybeSingle(),
    supabase.from('internal_interviews').select('*').eq('application_id', applicationId).maybeSingle(),
    supabase.from('application_test_assignments').select('*, job_tests(*)').eq('application_id', applicationId),
    supabase.from('application_disqualifications').select('*').eq('application_id', applicationId).order('disqualified_at', { ascending: false }),
    supabase.from('application_hires').select('*').eq('application_id', applicationId).maybeSingle(),
    supabase.from('application_stage_history').select('*').eq('application_id', applicationId).order('created_at', { ascending: false }),
    supabase.from('application_notes').select('*').eq('application_id', applicationId).order('created_at', { ascending: false }),
    supabase.from('finalists').select('id,project_id,application_id,status,franchise_opinion,ai_report,ai_report_status,ai_report_payload,franchise_approved_at').eq('application_id', applicationId).maybeSingle(),
  ]);
  [applicationResult, screeningResult, interviewResult, testsResult, disqualificationsResult, hireResult, historyResult, notesResult, finalistResult]
    .forEach((result) => throwIfError(result.error));
  return {
    application: applicationResult.data as Application,
    screening: screeningResult.data as CandidateScreening | null,
    interview: interviewResult.data as InternalInterview | null,
    tests: (testsResult.data ?? []).map((row) => {
      const item = row as unknown as ApplicationTestAssignment & { job_tests?: JobTest };
      const { job_tests, ...assignment } = item;
      return { ...assignment, job_test: job_tests };
    }),
    disqualifications: (disqualificationsResult.data ?? []) as ApplicationDisqualification[],
    hire: hireResult.data as ApplicationHire | null,
    history: (historyResult.data ?? []) as ApplicationStageHistory[],
    notes: notesResult.data ?? [],
    finalist: finalistResult.data as CandidateWorkspace['finalist'],
  };
}
