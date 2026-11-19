import { randomUUID } from 'node:crypto';
import { createMiddleware } from 'hono/factory';

export interface RequestIdVariables {
  requestId: string;
}

export const requestIdMiddleware = createMiddleware<{
  Variables: RequestIdVariables;
}>(async (c, next) => {
  const incomingId = c.req.header('x-request-id');
  const requestId = incomingId && incomingId.trim().length > 0 ? incomingId.trim() : randomUUID();

  c.set('requestId', requestId);
  c.header('x-request-id', requestId);

  await next();
});
