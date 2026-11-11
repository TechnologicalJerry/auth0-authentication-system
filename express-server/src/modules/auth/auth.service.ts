import type { AuthenticatedUser } from '../../integrations/auth0/auth0.types.js';
import type { CurrentUserContext } from '../users/users.types.js';
import type { AuthMeResponse, AuthStatusResponse } from './auth.types.js';
import { appConfig } from '../../config/app.config.js';

export class AuthService {
  /**
   * Maps the verified authenticated user and application user context to the /me response.
   * Never exposes the raw access token or sensitive credentials.
   */
  getMe(user: AuthenticatedUser, currentUser?: CurrentUserContext): AuthMeResponse {
    return {
      sub: user.sub,
      issuer: user.issuer,
      scopes: user.scopes,
      permissions: currentUser ? currentUser.permissions : user.permissions,
      roles: currentUser ? currentUser.roles : user.roles,
      ...(currentUser && {
        user: {
          id: currentUser.id,
          email: currentUser.email,
          displayName: currentUser.displayName,
        },
      }),
    };
  }

  /**
   * Returns Auth0 integration status.
   * Reports whether Auth0 is configured without disclosing credentials or JWKS data.
   */
  getStatus(): AuthStatusResponse {
    const { auth0 } = appConfig;

    return {
      provider: 'Auth0',
      configured: Boolean(auth0.domain && auth0.audience),
      domain: auth0.domain,
      audience: auth0.audience,
    };
  }
}

export const authService = new AuthService();
