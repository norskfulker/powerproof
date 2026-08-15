export type UserFeedbackType = 'bug_report' | 'feature_request' | 'incorrect_data'

export const USER_FEEDBACK_TYPES: readonly UserFeedbackType[] = [
  'bug_report',
  'feature_request',
  'incorrect_data',
] as const

export const USER_FEEDBACK_LABELS: Record<UserFeedbackType, string> = {
  bug_report: 'Report a bug',
  feature_request: 'Request a feature',
  incorrect_data: 'Report incorrect data',
}

/** Short labels for in-dialog tabs */
export const USER_FEEDBACK_TAB_LABELS: Record<UserFeedbackType, string> = {
  bug_report: 'Bug',
  feature_request: 'Feature',
  incorrect_data: 'Incorrect data',
}

export const USER_FEEDBACK_DIALOG_COPY: Record<
  UserFeedbackType,
  { title: string; description: string; placeholder: string }
> = {
  bug_report: {
    title: 'Report a bug',
    description: 'Describe what went wrong and how we can reproduce it.',
    placeholder: 'What happened? What did you expect?',
  },
  feature_request: {
    title: 'Request a feature',
    description: 'Tell us what you need and why it would help.',
    placeholder: 'Describe the feature or improvement…',
  },
  incorrect_data: {
    title: 'Report incorrect data',
    description: 'Point us to the page or item and what looks wrong.',
    placeholder: 'Which data is incorrect? Include links or names if you can.',
  },
}

export function parseUserFeedbackSelectValue(value: string): UserFeedbackType | null {
  if (value === 'help:feedback') return 'bug_report'
  if (value === 'help:bug_report') return 'bug_report'
  if (value === 'help:feature_request') return 'feature_request'
  if (value === 'help:incorrect_data') return 'incorrect_data'
  return null
}
