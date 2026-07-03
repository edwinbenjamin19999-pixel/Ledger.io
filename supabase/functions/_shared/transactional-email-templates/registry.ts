/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as launchAnnouncement } from './launch-announcement.tsx'
import { template as coSignerInvite } from './co-signer-invite.tsx'
import { template as bvDeadlineReminder } from './bv-deadline-reminder.tsx'
import { template as pilotWelcome } from './pilot-welcome.tsx'
import { template as firmClientInvite } from './firm-client-invite.tsx'
import { template as testAccountCredentials } from './test-account-credentials.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'launch-announcement': launchAnnouncement,
  'co-signer-invite': coSignerInvite,
  'bv-deadline-reminder': bvDeadlineReminder,
  'pilot-welcome': pilotWelcome,
  'firm-client-invite': firmClientInvite,
  'test-account-credentials': testAccountCredentials,
}
