import { z } from "zod";

const voidSchema = z.undefined();

export const systemPermissionSchema = z.enum(["macos_accessibility"]);
export type SystemPermission = z.infer<typeof systemPermissionSchema>;

export const systemPermissionRequestSchema = z.object({
  permission: systemPermissionSchema,
});
export type SystemPermissionRequest = z.infer<typeof systemPermissionRequestSchema>;

export const systemPermissionStatusSchema = z.object({
  granted: z.boolean(),
  permission: systemPermissionSchema,
  supported: z.boolean(),
});
export type SystemPermissionStatus = z.infer<typeof systemPermissionStatusSchema>;

export const systemPermissionsContract = {
  commands: {
    "system-permissions.get": {
      input: systemPermissionRequestSchema,
      output: systemPermissionStatusSchema,
    },
    "system-permissions.open-settings": {
      input: systemPermissionRequestSchema,
      output: voidSchema,
    },
    "system-permissions.request": {
      input: systemPermissionRequestSchema,
      output: systemPermissionStatusSchema,
    },
  },
  events: {},
} as const;
