import { z } from 'zod';

export const serviceNowUpdateRecordSchema = z.object({
  sysId: z.string().describe('ServiceNow sys_id or stable source identifier.'),
  number: z.string().describe('ServiceNow-style change number, for example CHG00579968.'),
  shortDescription: z.string().describe('Short description shown in the work queue.'),
  description: z.string().describe('Full update description.'),
  product: z.string().describe('Microsoft product affected by the update.'),
  source: z.string().describe('Source system, for example Microsoft 365 Roadmap.'),
  status: z.enum(['In development', 'Rolling out', 'Generally available', 'Unknown']),
  priority: z.enum(['1', '2', '3', '4', '5']).describe('ServiceNow-style priority where 1 is highest.'),
  state: z.enum(['Assess', 'Plan', 'Implement', 'Monitor', 'Closed']),
  assignedTo: z.string().describe('Team responsible for assessing the update.'),
  modifiedOn: z.string().describe('Source modified date in ISO format.'),
  sourceUrl: z.string().url().optional().describe('Microsoft source URL.'),
  roadmapId: z.string().optional().describe('Microsoft 365 Roadmap identifier.')
});

const propertiesSchema = z.object({
  title: z.string().optional().describe('Dashboard title.'),
  timeWindowDays: z.number().int().positive().max(365).optional().describe('Number of days to show.'),
  product: z.string().optional().describe('Optional initial product filter.'),
  status: z.string().optional().describe('Optional initial rollout-status filter.'),
  connectorName: z.string().optional().describe('Name of the connector that supplied the records.'),
  records: z.array(serviceNowUpdateRecordSchema).max(100).optional().describe('Copilot update records returned by a ServiceNow connector or test payload.')
});

export type IServiceNowCopilotUpdatesCopilotComponentProperties = z.infer<typeof propertiesSchema>;
export type IServiceNowUpdateRecord = z.infer<typeof serviceNowUpdateRecordSchema>;

export default z.toJSONSchema(propertiesSchema, { target: 'draft-7' });
