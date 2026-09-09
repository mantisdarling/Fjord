import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true });
export const eventSchema = z.object({
  eventId: z.string().uuid(),
  ts: isoDate,
  eventType: z.enum(['page_visit', 'tab_switch', 'page_context', 'form_interaction', 'idle_start', 'idle_end']),
  domain: z.string().min(1).max(253).regex(/^[a-z0-9.-]+$/i),
  urlHash: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  title: z.string().max(240).optional(),
  durationSec: z.number().int().min(0).max(86400).optional(),
  category: z.enum(['productivity', 'communication', 'entertainment', 'shopping', 'reference', 'development', 'administration', 'uncategorized']).default('uncategorized'),
  device: z.literal('chrome-desktop').default('chrome-desktop')
}).strict();

export const batchSchema = z.object({
  idempotencyKey: z.string().uuid(),
  events: z.array(eventSchema).min(1).max(500)
}).strict();

export const eventsQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.coerce.number().int().min(0).default(0)
}).refine((value) => !value.from || !value.to || new Date(value.from) <= new Date(value.to), { message: 'from must be before to' });
