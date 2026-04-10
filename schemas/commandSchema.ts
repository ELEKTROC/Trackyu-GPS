import { z } from 'zod';

export const CommandSchema = z.object({
    vehicleId: z.string().min(1, "Le véhicule est requis"),
    commandType: z.enum([
        'POSITION', 'STATUS', 'REBOOT',
        'ENGINE_STOP', 'ENGINE_RESUME', 'DOOR_OPEN', 'DOOR_CLOSE',
        'SET_ODOMETER', 'FACTORY_RESET', 'CUSTOM'
    ]),
    transport: z.enum(['GPRS', 'SMS']),
    parameter: z.string().optional(),
    reason: z.string().optional()
}).refine((data) => {
    if (['ENGINE_STOP', 'FACTORY_RESET'].includes(data.commandType)) {
        return !!data.reason && data.reason.length > 5;
    }
    return true;
}, {
    message: "Une justification est requise pour cette commande critique",
    path: ["reason"]
}).refine((data) => {
    if (['SET_ODOMETER', 'CUSTOM'].includes(data.commandType)) {
        return !!data.parameter;
    }
    return true;
}, {
    message: "Ce paramètre est requis pour ce type de commande",
    path: ["parameter"]
});

export type CommandFormData = z.infer<typeof CommandSchema>;
