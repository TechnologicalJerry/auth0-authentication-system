import 'dotenv/config';
import { prisma } from '../src/database/prisma.client.js';
import { SYSTEM_ROLES } from '../src/common/constants/roles.constants.js';
import { PERMISSIONS } from '../src/common/constants/permissions.constants.js';

interface RoleDefinition {
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

const ALL_PERMISSIONS = [
  { name: PERMISSIONS.USERS_READ, description: 'View user records and inspect details' },
  { name: PERMISSIONS.USERS_CREATE, description: 'Provision new application users' },
  { name: PERMISSIONS.USERS_UPDATE, description: 'Update user profiles and account statuses' },
  { name: PERMISSIONS.USERS_DELETE, description: 'Remove or archive user accounts' },

  { name: PERMISSIONS.ROLES_READ, description: 'Inspect application roles and assigned permissions' },
  { name: PERMISSIONS.ROLES_CREATE, description: 'Create new custom application roles' },
  { name: PERMISSIONS.ROLES_UPDATE, description: 'Modify custom role details and active status' },
  { name: PERMISSIONS.ROLES_DELETE, description: 'Delete unused custom application roles' },
  { name: PERMISSIONS.ROLES_ASSIGN, description: 'Assign roles to users and revoke role assignments' },

  { name: PERMISSIONS.PERMISSIONS_READ, description: 'View catalog of system permissions' },
  { name: PERMISSIONS.PERMISSIONS_MANAGE, description: 'Bulk assign and update role-permission mappings' },

  { name: PERMISSIONS.DASHBOARD_READ, description: 'Access administrative analytics and metrics dashboard' },
  { name: PERMISSIONS.AUDIT_LOGS_READ, description: 'View security and administrative audit logs' },
];

const INITIAL_ROLES: RoleDefinition[] = [
  {
    name: SYSTEM_ROLES.SUPER_ADMIN,
    description: 'Root system administrator with unrestricted authority',
    isSystem: true,
    permissions: Object.values(PERMISSIONS),
  },
  {
    name: SYSTEM_ROLES.ADMIN,
    description: 'Application administrator managing users, roles, and administrative dashboards',
    isSystem: true,
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_CREATE,
      PERMISSIONS.ROLES_UPDATE,
      PERMISSIONS.ROLES_DELETE,
      PERMISSIONS.ROLES_ASSIGN,
      PERMISSIONS.PERMISSIONS_READ,
      PERMISSIONS.PERMISSIONS_MANAGE,
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.AUDIT_LOGS_READ,
    ],
  },
  {
    name: SYSTEM_ROLES.MANAGER,
    description: 'Operations manager with viewing access to users, roles, and dashboard metrics',
    isSystem: true,
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.PERMISSIONS_READ,
      PERMISSIONS.DASHBOARD_READ,
    ],
  },
  {
    name: SYSTEM_ROLES.USER,
    description: 'Standard application user with self-service profile management',
    isSystem: true,
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_UPDATE,
    ],
  },
  {
    name: SYSTEM_ROLES.VIEWER,
    description: 'Auditor or guest user with read-only view access',
    isSystem: true,
    permissions: [
      PERMISSIONS.USERS_READ,
    ],
  },
];

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Permissions
  console.log(`\n📌 Seeding ${ALL_PERMISSIONS.length} permissions...`);
  const permissionMap = new Map<string, string>();

  for (const perm of ALL_PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: {
        name: perm.name,
        description: perm.description,
      },
    });
    permissionMap.set(perm.name, record.id);
    console.log(`   ✓ Permission: ${record.name}`);
  }

  // 2. Seed Roles and assign RolePermissions
  console.log(`\n📌 Seeding ${INITIAL_ROLES.length} system roles and role-permission mappings...`);

  for (const roleDef of INITIAL_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isActive: true,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isActive: true,
      },
    });

    console.log(`   ✓ Role: ${role.name}`);

    // Map permissions to this role
    const permissionIds = roleDef.permissions
      .map((pName) => permissionMap.get(pName))
      .filter((id): id is string => Boolean(id));

    // Clear existing mappings to allow idempotent updates
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((pId) => ({
          roleId: role.id,
          permissionId: pId,
        })),
        skipDuplicates: true,
      });
      console.log(`     Mapped ${permissionIds.length} permissions to ${role.name}`);
    }
  }

  console.log('\n✅ Database seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
