import type { AuthenticatedUser } from '../integrations/auth0/auth0.types.js';
import type { CurrentUserContext } from '../modules/users/users.types.js';

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Authenticated user identity extracted from verified Auth0 access token.
     * Only defined after `authenticate` preHandler hook executes successfully.
     */
    auth?: AuthenticatedUser;

    /**
     * Application database user and RBAC authorization context.
     * Synchronized and populated during `authenticate`.
     */
    currentUser?: CurrentUserContext;
  }

  interface FastifyInstance {
    /**
     * PreHandler authentication hook decorator ensuring requests have a valid Auth0 token.
     */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    /**
     * PreHandler hook decorating `request.auth` if token is provided, without rejecting if omitted.
     */
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
