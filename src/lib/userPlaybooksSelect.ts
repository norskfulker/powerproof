/** Columns for playbook list cards / history (avoids loading full `steps` JSON when possible). */
export const USER_PLAYBOOKS_LIST_SELECT = [
  'id',
  'project_id',
  'business_name',
  'business_description',
  'business_type',
  'country',
  'city',
  'industry',
  'context_answers',
  'generation_status',
  'credits_used',
  'model_used',
  'steps_checked',
  'created_at',
  'edge_declaration',
  'founder_honest_take',
  'thirty_day_sprint',
  'red_flags',
  'step_count',
  'clarify_state',
].join(', ')

/** Full row for detail view and step toggles. */
export const USER_PLAYBOOKS_DETAIL_SELECT = `${USER_PLAYBOOKS_LIST_SELECT}, steps`
