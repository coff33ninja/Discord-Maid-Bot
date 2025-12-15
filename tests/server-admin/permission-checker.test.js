/**
 * Permission Checker Property Tests
 * 
 * Property-based tests for the auth permission system.
 * Uses fast-check for generating random test inputs.
 * 
 * @module tests/server-admin/permission-checker.test
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ROLES, PERMISSIONS, hasPermission } from '../../src/auth/auth.js';

// Server admin permissions that require ADMIN role
const ADMIN_ONLY_PERMISSIONS = [
  PERMISSIONS.SERVER_SERVICE,
  PERMISSIONS.SERVER_DEPLOY,
  PERMISSIONS.SERVER_MAINTENANCE,
  PERMISSIONS.DISCORD_MANAGE_ROLES,
  PERMISSIONS.DISCORD_MANAGE_CHANNELS,
  PERMISSIONS.DISCORD_MODERATE_MEMBERS,
  PERMISSIONS.DISCORD_MANAGE_SERVER,
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MODIFY_CONFIG,
  PERMISSIONS.VIEW_LOGS
];

// Permissions that OPERATOR role has
const OPERATOR_PERMISSIONS = [
  PERMISSIONS.SCAN_NETWORK,
  PERMISSIONS.WAKE_DEVICE,
  PERMISSIONS.RUN_SPEEDTEST,
  PERMISSIONS.VIEW_SPEEDTEST,
  PERMISSIONS.RUN_RESEARCH,
  PERMISSIONS.VIEW_RESEARCH,
  PERMISSIONS.VIEW_TASK,
  PERMISSIONS.VIEW_CONFIG,
  PERMISSIONS.ACCESS_DASHBOARD,
  PERMISSIONS.CONTROL_LIGHTS,
  PERMISSIONS.CONTROL_SWITCHES,
  PERMISSIONS.CONTROL_CLIMATE,
  PERMISSIONS.SERVER_STATUS
];

// Permissions that VIEWER role has
const VIEWER_PERMISSIONS = [
  PERMISSIONS.VIEW_SPEEDTEST,
  PERMISSIONS.VIEW_RESEARCH,
  PERMISSIONS.VIEW_TASK,
  PERMISSIONS.VIEW_CONFIG,
  PERMISSIONS.ACCESS_DASHBOARD
];

describe('Permission Checker', () => {
  /**
   * **Feature: ai-server-admin, Property 6: Access Control Enforcement**
   * *For any* user without admin permission attempting a server command,
   * the system SHALL deny the request and return allowed=false.
   * **Validates: Requirements 1.5**
   */
  describe('Property 6: Access Control Enforcement', () => {
    it('should deny admin-only permissions to non-admin roles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ADMIN_ONLY_PERMISSIONS),
          fc.constantFrom(ROLES.OPERATOR, ROLES.VIEWER),
          (permission, role) => {
            const result = hasPermission(role, permission);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should grant all permissions to admin role', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(PERMISSIONS)),
          (permission) => {
            const result = hasPermission(ROLES.ADMIN, permission);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should grant operator permissions to operator role', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...OPERATOR_PERMISSIONS),
          (permission) => {
            const result = hasPermission(ROLES.OPERATOR, permission);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should grant viewer permissions to viewer role', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VIEWER_PERMISSIONS),
          (permission) => {
            const result = hasPermission(ROLES.VIEWER, permission);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny server admin permissions to viewer role', () => {
      const serverAdminPermissions = [
        PERMISSIONS.SERVER_STATUS,
        PERMISSIONS.SERVER_SERVICE,
        PERMISSIONS.SERVER_DEPLOY,
        PERMISSIONS.SERVER_MAINTENANCE
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...serverAdminPermissions),
          (permission) => {
            const result = hasPermission(ROLES.VIEWER, permission);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny discord admin permissions to non-admin roles', () => {
      const discordAdminPermissions = [
        PERMISSIONS.DISCORD_MANAGE_ROLES,
        PERMISSIONS.DISCORD_MANAGE_CHANNELS,
        PERMISSIONS.DISCORD_MODERATE_MEMBERS,
        PERMISSIONS.DISCORD_MANAGE_SERVER
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...discordAdminPermissions),
          fc.constantFrom(ROLES.OPERATOR, ROLES.VIEWER),
          (permission, role) => {
            const result = hasPermission(role, permission);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false for unknown roles', () => {
      // Exclude built-in object properties that could cause issues
      const builtInProps = ['toString', 'valueOf', 'hasOwnProperty', 'constructor', '__proto__'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
            !Object.values(ROLES).includes(s) && !builtInProps.includes(s)
          ),
          fc.constantFrom(...Object.values(PERMISSIONS)),
          (unknownRole, permission) => {
            const result = hasPermission(unknownRole, permission);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false for unknown permissions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ROLES)),
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !Object.values(PERMISSIONS).includes(s)),
          (role, unknownPermission) => {
            // Admin gets all defined permissions, but unknown ones should still return false
            // Actually, admin gets Object.values(PERMISSIONS), so unknown perms return false
            if (role === ROLES.ADMIN) {
              // Admin only has defined permissions, not arbitrary strings
              const result = hasPermission(role, unknownPermission);
              expect(result).toBe(false);
            } else {
              const result = hasPermission(role, unknownPermission);
              expect(result).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Role Hierarchy', () => {
    it('should ensure admin has superset of operator permissions', () => {
      for (const permission of OPERATOR_PERMISSIONS) {
        expect(hasPermission(ROLES.ADMIN, permission)).toBe(true);
        expect(hasPermission(ROLES.OPERATOR, permission)).toBe(true);
      }
    });

    it('should ensure operator has superset of viewer permissions', () => {
      for (const permission of VIEWER_PERMISSIONS) {
        expect(hasPermission(ROLES.ADMIN, permission)).toBe(true);
        expect(hasPermission(ROLES.OPERATOR, permission)).toBe(true);
        expect(hasPermission(ROLES.VIEWER, permission)).toBe(true);
      }
    });
  });

  describe('Server Admin Specific Permissions', () => {
    it('should allow operator to view server status', () => {
      expect(hasPermission(ROLES.OPERATOR, PERMISSIONS.SERVER_STATUS)).toBe(true);
    });

    it('should deny operator from service management', () => {
      expect(hasPermission(ROLES.OPERATOR, PERMISSIONS.SERVER_SERVICE)).toBe(false);
    });

    it('should deny operator from deployment', () => {
      expect(hasPermission(ROLES.OPERATOR, PERMISSIONS.SERVER_DEPLOY)).toBe(false);
    });

    it('should deny operator from maintenance', () => {
      expect(hasPermission(ROLES.OPERATOR, PERMISSIONS.SERVER_MAINTENANCE)).toBe(false);
    });

    it('should allow admin all server permissions', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.SERVER_STATUS)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.SERVER_SERVICE)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.SERVER_DEPLOY)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.SERVER_MAINTENANCE)).toBe(true);
    });
  });

  describe('Discord Admin Specific Permissions', () => {
    it('should allow admin all discord permissions', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.DISCORD_MANAGE_ROLES)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.DISCORD_MANAGE_CHANNELS)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.DISCORD_MODERATE_MEMBERS)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.DISCORD_MANAGE_SERVER)).toBe(true);
    });

    it('should deny operator all discord admin permissions', () => {
      expect(hasPermission(ROLES.OPERATOR, PERMISSIONS.DISCORD_MANAGE_ROLES)).toBe(false);
      expect(hasPermission(ROLES.OPERATOR, PERMISSIONS.DISCORD_MANAGE_CHANNELS)).toBe(false);
      expect(hasPermission(ROLES.OPERATOR, PERMISSIONS.DISCORD_MODERATE_MEMBERS)).toBe(false);
      expect(hasPermission(ROLES.OPERATOR, PERMISSIONS.DISCORD_MANAGE_SERVER)).toBe(false);
    });

    it('should deny viewer all discord admin permissions', () => {
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.DISCORD_MANAGE_ROLES)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.DISCORD_MANAGE_CHANNELS)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.DISCORD_MODERATE_MEMBERS)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.DISCORD_MANAGE_SERVER)).toBe(false);
    });
  });
});
