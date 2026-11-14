import { appConfig } from '../config/app.config.js';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Auth0 Authentication System API (Express.js)',
    version: appConfig.env.APP_VERSION,
    description:
      'Production-ready, scalable Express.js authentication, RBAC, and user management platform integrated with Auth0 and PostgreSQL.',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: appConfig.env.API_PREFIX,
      description: 'Current API prefix',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Auth0-issued RS256 JWT access token',
      },
    },
    schemas: {
      ApiSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ApiErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'An error occurred' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
              details: { type: 'object' },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Application health status',
        responses: {
          '200': { description: 'Application status and version' },
        },
      },
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Kubernetes/Docker liveness probe',
        responses: {
          '200': { description: 'Process is alive' },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Kubernetes/Docker readiness probe',
        responses: {
          '200': { description: 'Dependencies ready to accept traffic' },
          '503': { description: 'Database unavailable' },
        },
      },
    },
    '/health/dependencies': {
      get: {
        tags: ['Health'],
        summary: 'Diagnostic dependency response times',
        responses: {
          '200': { description: 'Latency and diagnostic metrics' },
          '503': { description: 'Critical dependency failure' },
        },
      },
    },
    '/auth/status': {
      get: {
        tags: ['Auth'],
        summary: 'Auth0 integration configuration status',
        responses: {
          '200': { description: 'Integration status' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current authenticated user identity and context',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Verified claims, roles, and permissions' },
          '401': { description: 'Missing or invalid token' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Retrieve logged-in user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User profile retrieved' },
          '401': { description: 'Unauthorized' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update self profile metadata',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  displayName: { type: 'string' },
                  profilePicture: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Profile updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users with pagination and search',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'isBlocked', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Users list with pagination' },
          '403': { description: 'Forbidden (requires users:read)' },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by UUID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'User record' },
          '404': { description: 'User not found' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user by administrator',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  displayName: { type: 'string' },
                  isActive: { type: 'boolean' },
                  isBlocked: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'User updated' },
          '403': { description: 'Forbidden (requires users:update)' },
        },
      },
    },
    '/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Toggle active or blocked account status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isActive: { type: 'boolean' },
                  isBlocked: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status updated' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/users/{id}/roles': {
      post: {
        tags: ['Users', 'Roles'],
        summary: 'Assign role to user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['roleId'],
                properties: { roleId: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Role assigned' },
          '409': { description: 'Role already assigned' },
        },
      },
    },
    '/users/{id}/roles/{roleId}': {
      delete: {
        tags: ['Users', 'Roles'],
        summary: 'Revoke role from user',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'roleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Role revoked' },
          '403': { description: 'Self-revocation of SUPER_ADMIN blocked' },
        },
      },
    },
    '/roles': {
      get: {
        tags: ['Roles'],
        summary: 'List roles',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Roles list' },
        },
      },
      post: {
        tags: ['Roles'],
        summary: 'Create custom role',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'SUPPORT_LEAD' },
                  description: { type: 'string' },
                  permissionIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Role created' },
          '409': { description: 'Role already exists' },
        },
      },
    },
    '/roles/{id}': {
      get: {
        tags: ['Roles'],
        summary: 'Get role details',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Role details' },
        },
      },
      patch: {
        tags: ['Roles'],
        summary: 'Update custom role',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Role updated' },
          '403': { description: 'System role protected' },
        },
      },
      delete: {
        tags: ['Roles'],
        summary: 'Delete custom role',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Role deleted' },
          '400': { description: 'Users still assigned' },
          '403': { description: 'System role protected' },
        },
      },
    },
    '/roles/{id}/permissions': {
      get: {
        tags: ['Roles', 'Permissions'],
        summary: 'List permissions assigned to role',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Permissions list' },
        },
      },
      put: {
        tags: ['Roles', 'Permissions'],
        summary: 'Atomically replace role permissions',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['permissionIds'],
                properties: {
                  permissionIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Role permissions updated' },
        },
      },
    },
    '/permissions': {
      get: {
        tags: ['Permissions'],
        summary: 'List all available permissions',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Permissions catalog' },
        },
      },
    },
    '/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Admin dashboard overview statistics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'System counts and health overview' },
        },
      },
    },
    '/admin/users/statistics': {
      get: {
        tags: ['Admin'],
        summary: 'User registration and status distribution metrics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User statistics' },
        },
      },
    },
    '/admin/roles/statistics': {
      get: {
        tags: ['Admin'],
        summary: 'Role allocation and permission assignment counts',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Role statistics' },
        },
      },
    },
    '/audit-logs': {
      get: {
        tags: ['Audit Logs'],
        summary: 'List security and administrative audit logs',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'resource', in: 'query', schema: { type: 'string' } },
          { name: 'resourceId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['SUCCESS', 'FAILURE'] } },
          { name: 'correlationId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Audit log entries with pagination' },
          '403': { description: 'Forbidden (requires audit-logs:read)' },
        },
      },
    },
    '/audit-logs/{id}': {
      get: {
        tags: ['Audit Logs'],
        summary: 'Get single audit log entry by UUID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Audit log entry' },
          '404': { description: 'Not found' },
        },
      },
    },
  },
};

