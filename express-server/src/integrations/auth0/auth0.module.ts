export type { AuthenticatedUser, TokenVerificationResult } from './auth0.types.js';
export { verifyAccessToken } from './auth0.verifier.js';
export { getJWKSClient } from './auth0.client.js';
export {
  mapClaimsToUser,
  extractScopes,
  extractPermissions,
  extractRoles,
} from './auth0.claim-mapper.js';
export {
  AUTHORIZATION_HEADER,
  BEARER_PREFIX,
} from './auth0.constants.js';
