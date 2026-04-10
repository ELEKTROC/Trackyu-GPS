import { z } from 'zod';

// Schéma pour le formulaire utilisateur (comptes CLIENT + sous-utilisateurs)
// Les rôles Staff/Admin sont gérés dans le module Administration
export const UserFullSchema = z.object({
    // Tab 1: Personal Data
    firstName: z.string().min(2, "Le prénom est requis"),
    lastName: z.string().min(2, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    phone: z.string().optional(),
    address: z.string().optional(),
    companyName: z.string().optional(),
    resellerId: z.string().optional(),
    clientId: z.string().optional(),

    // Sécurité
    password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères").optional(),
    mustChangePassword: z.boolean().default(true),
    isActive: z.boolean().default(true),
    lastLogin: z.string().optional(),
    passwordErrors: z.number().default(0),

    // Tab 2: User Settings
    language: z.string(),
    timezone: z.string(),
    theme: z.enum(['light', 'dark', 'system']),
    notifications: z.object({
        email: z.boolean(),
        sms: z.boolean(),
        push: z.boolean()
    }),

    // Tab 3: Permissions
    role: z.enum(['CLIENT', 'Admin', 'Manager', 'User', 'Viewer']).default('CLIENT'),
    accessLevel: z.enum(['Read', 'Write', 'Admin']),
    allowedVehicles: z.array(z.string()).default([]),
    allowedGroups: z.array(z.string()).default([]),
    allowedModules: z.array(z.string()).default([]),

    // Tab 4: Sub-users (full SubUserFormData shape embedded)
    subUsers: z.array(z.object({
        id: z.string().optional(),
        nom: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        role: z.string(),
        statut: z.string().optional(),
        password: z.string().optional(),
        branchId: z.string().optional(),
        clientId: z.string().optional(),
        vehicleIds: z.array(z.string()).default([]),
        allVehicles: z.boolean().default(false),
        permissions: z.record(z.boolean()).optional(),
        notes: z.string().optional(),
    })).default([]),

    // Tab 5: Documents
    documents: z.array(z.object({
        name: z.string(),
        type: z.string(),
        date: z.string(),
        size: z.string()
    })).default([])
});

export type UserFormData = z.infer<typeof UserFullSchema>;
