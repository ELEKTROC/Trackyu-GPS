// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { 
    calculateResolutionTime, 
    calculateResponseTime, 
    calculateWaitTime,
    formatDuration, 
    calculateResolutionStats,
    isOverSLA,
    getResolutionTimeColor
} from '../features/tech/utils/resolutionTime';
import { InterventionSchema, InterventionTypeSchema, InterventionStatusSchema } from '../schemas/interventionSchema';
import { Intervention } from '../types';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================
const createMockIntervention = (overrides: Partial<Intervention> = {}): Intervention => ({
    id: 'INT-001',
    tenantId: 'tenant_default',
    clientId: 'CLI-001',
    technicianId: 'TECH-001',
    type: 'INSTALLATION',
    status: 'COMPLETED',
    scheduledDate: '2025-12-22T10:00:00Z',
    createdAt: '2025-12-22T08:00:00Z',
    updatedAt: '2025-12-22T12:00:00Z',
    description: 'Test intervention',
    duration: 60,
    location: 'Test Location',
    ...overrides
});

// ============================================================================
// RESOLUTION TIME CALCULATION TESTS
// ============================================================================
describe('calculateResolutionTime', () => {
    describe('Valid Calculations', () => {
        it('should calculate resolution time correctly', () => {
            const intervention = createMockIntervention({
                status: 'COMPLETED',
                startTime: '2025-12-22T10:00:00Z',
                endTime: '2025-12-22T12:30:00Z'
            });
            
            const result = calculateResolutionTime(intervention);
            expect(result).toBe(150); // 2h30 = 150 minutes
        });

        it('should calculate short resolution time', () => {
            const intervention = createMockIntervention({
                status: 'COMPLETED',
                startTime: '2025-12-22T10:00:00Z',
                endTime: '2025-12-22T10:45:00Z'
            });
            
            const result = calculateResolutionTime(intervention);
            expect(result).toBe(45); // 45 minutes
        });

        it('should calculate long resolution time (over 24h)', () => {
            const intervention = createMockIntervention({
                status: 'COMPLETED',
                startTime: '2025-12-20T10:00:00Z',
                endTime: '2025-12-22T14:00:00Z'
            });
            
            const result = calculateResolutionTime(intervention);
            expect(result).toBe(52 * 60); // 52 hours = 3120 minutes
        });
    });

    describe('Invalid/Edge Cases', () => {
        it('should return null for non-COMPLETED status', () => {
            const statuses = ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'CANCELLED'];
            
            statuses.forEach(status => {
                const intervention = createMockIntervention({
                    status: status as any,
                    startTime: '2025-12-22T10:00:00Z',
                    endTime: '2025-12-22T12:00:00Z'
                });
                
                expect(calculateResolutionTime(intervention)).toBeNull();
            });
        });

        it('should return null when startTime is missing', () => {
            const intervention = createMockIntervention({
                status: 'COMPLETED',
                startTime: undefined,
                endTime: '2025-12-22T12:00:00Z'
            });
            
            expect(calculateResolutionTime(intervention)).toBeNull();
        });

        it('should return null when endTime is missing', () => {
            const intervention = createMockIntervention({
                status: 'COMPLETED',
                startTime: '2025-12-22T10:00:00Z',
                endTime: undefined
            });
            
            expect(calculateResolutionTime(intervention)).toBeNull();
        });

        it('should return null when endTime is before startTime', () => {
            const intervention = createMockIntervention({
                status: 'COMPLETED',
                startTime: '2025-12-22T14:00:00Z',
                endTime: '2025-12-22T10:00:00Z'
            });
            
            expect(calculateResolutionTime(intervention)).toBeNull();
        });

        it('should return null for invalid date formats', () => {
            const intervention = createMockIntervention({
                status: 'COMPLETED',
                startTime: 'invalid-date',
                endTime: '2025-12-22T12:00:00Z'
            });
            
            expect(calculateResolutionTime(intervention)).toBeNull();
        });
    });
});

// ============================================================================
// RESPONSE TIME CALCULATION TESTS
// ============================================================================
describe('calculateResponseTime', () => {
    it('should calculate response time from creation to start', () => {
        const intervention = createMockIntervention({
            createdAt: '2025-12-22T08:00:00Z',
            startTime: '2025-12-22T10:30:00Z'
        });
        
        const result = calculateResponseTime(intervention);
        expect(result).toBe(150); // 2h30 = 150 minutes
    });

    it('should return null when createdAt is missing', () => {
        const intervention = createMockIntervention({
            createdAt: undefined,
            startTime: '2025-12-22T10:00:00Z'
        });
        
        expect(calculateResponseTime(intervention)).toBeNull();
    });

    it('should return null when startTime is missing', () => {
        const intervention = createMockIntervention({
            createdAt: '2025-12-22T08:00:00Z',
            startTime: undefined
        });
        
        expect(calculateResponseTime(intervention)).toBeNull();
    });
});

// ============================================================================
// FORMAT DURATION TESTS
// ============================================================================
describe('formatDuration', () => {
    describe('Minutes Only', () => {
        it('should format 0 minutes', () => {
            expect(formatDuration(0)).toBe('0min');
        });

        it('should format minutes under 60', () => {
            expect(formatDuration(30)).toBe('30min');
            expect(formatDuration(45)).toBe('45min');
            expect(formatDuration(59)).toBe('59min');
        });
    });

    describe('Hours', () => {
        it('should format exact hours', () => {
            expect(formatDuration(60)).toBe('1h');
            expect(formatDuration(120)).toBe('2h');
            expect(formatDuration(180)).toBe('3h');
        });

        it('should format hours with minutes', () => {
            expect(formatDuration(90)).toBe('1h 30min');
            expect(formatDuration(150)).toBe('2h 30min');
            expect(formatDuration(195)).toBe('3h 15min');
        });
    });

    describe('Days', () => {
        it('should format exact days', () => {
            expect(formatDuration(24 * 60)).toBe('1j');
            expect(formatDuration(48 * 60)).toBe('2j');
        });

        it('should format days with hours', () => {
            expect(formatDuration(26 * 60)).toBe('1j 2h'); // 26 hours
            expect(formatDuration(30 * 60)).toBe('1j 6h'); // 30 hours
        });
    });

    describe('Edge Cases', () => {
        it('should return - for null', () => {
            expect(formatDuration(null)).toBe('-');
        });

        it('should return - for negative values', () => {
            expect(formatDuration(-10)).toBe('-');
            expect(formatDuration(-100)).toBe('-');
        });
    });
});

// ============================================================================
// RESOLUTION STATS TESTS
// ============================================================================
describe('calculateResolutionStats', () => {
    it('should calculate stats for multiple completed interventions', () => {
        const interventions = [
            createMockIntervention({
                id: 'INT-001',
                status: 'COMPLETED',
                startTime: '2025-12-22T10:00:00Z',
                endTime: '2025-12-22T11:00:00Z' // 60 min
            }),
            createMockIntervention({
                id: 'INT-002',
                status: 'COMPLETED',
                startTime: '2025-12-22T10:00:00Z',
                endTime: '2025-12-22T12:00:00Z' // 120 min
            }),
            createMockIntervention({
                id: 'INT-003',
                status: 'COMPLETED',
                startTime: '2025-12-22T10:00:00Z',
                endTime: '2025-12-22T11:30:00Z' // 90 min
            })
        ];
        
        const stats = calculateResolutionStats(interventions);
        
        expect(stats.count).toBe(3);
        expect(stats.min).toBe(60);
        expect(stats.max).toBe(120);
        expect(stats.average).toBe(90); // (60 + 120 + 90) / 3
        expect(stats.median).toBe(90); // Middle value when sorted [60, 90, 120]
    });

    it('should return null stats for empty array', () => {
        const stats = calculateResolutionStats([]);
        
        expect(stats.count).toBe(0);
        expect(stats.average).toBeNull();
        expect(stats.median).toBeNull();
        expect(stats.min).toBeNull();
        expect(stats.max).toBeNull();
    });

    it('should ignore non-completed interventions', () => {
        const interventions = [
            createMockIntervention({
                id: 'INT-001',
                status: 'COMPLETED',
                startTime: '2025-12-22T10:00:00Z',
                endTime: '2025-12-22T11:00:00Z' // 60 min
            }),
            createMockIntervention({
                id: 'INT-002',
                status: 'PENDING', // Not completed
                startTime: '2025-12-22T10:00:00Z',
                endTime: '2025-12-22T15:00:00Z'
            }),
            createMockIntervention({
                id: 'INT-003',
                status: 'IN_PROGRESS', // Not completed
                startTime: '2025-12-22T10:00:00Z',
                endTime: '2025-12-22T14:00:00Z'
            })
        ];
        
        const stats = calculateResolutionStats(interventions);
        
        expect(stats.count).toBe(1);
        expect(stats.average).toBe(60);
    });

    it('should ignore interventions without valid times', () => {
        const interventions = [
            createMockIntervention({
                id: 'INT-001',
                status: 'COMPLETED',
                startTime: '2025-12-22T10:00:00Z',
                endTime: '2025-12-22T11:00:00Z' // 60 min
            }),
            createMockIntervention({
                id: 'INT-002',
                status: 'COMPLETED',
                startTime: undefined, // Missing startTime
                endTime: '2025-12-22T12:00:00Z'
            })
        ];
        
        const stats = calculateResolutionStats(interventions);
        
        expect(stats.count).toBe(1);
    });
});

// ============================================================================
// SLA TESTS
// ============================================================================
describe('isOverSLA', () => {
    it('should return true when resolution exceeds DEPANNAGE SLA (4h)', () => {
        const intervention = createMockIntervention({
            type: 'DEPANNAGE',
            status: 'COMPLETED',
            startTime: '2025-12-22T10:00:00Z',
            endTime: '2025-12-22T15:00:00Z' // 5 hours
        });
        
        expect(isOverSLA(intervention)).toBe(true);
    });

    it('should return false when resolution is within DEPANNAGE SLA', () => {
        const intervention = createMockIntervention({
            type: 'DEPANNAGE',
            status: 'COMPLETED',
            startTime: '2025-12-22T10:00:00Z',
            endTime: '2025-12-22T13:00:00Z' // 3 hours
        });
        
        expect(isOverSLA(intervention)).toBe(false);
    });

    it('should return true when resolution exceeds INSTALLATION SLA (24h)', () => {
        const intervention = createMockIntervention({
            type: 'INSTALLATION',
            status: 'COMPLETED',
            startTime: '2025-12-20T10:00:00Z',
            endTime: '2025-12-22T12:00:00Z' // ~50 hours
        });
        
        expect(isOverSLA(intervention)).toBe(true);
    });

    it('should return false when resolution is within INSTALLATION SLA', () => {
        const intervention = createMockIntervention({
            type: 'INSTALLATION',
            status: 'COMPLETED',
            startTime: '2025-12-22T10:00:00Z',
            endTime: '2025-12-23T08:00:00Z' // 22 hours
        });
        
        expect(isOverSLA(intervention)).toBe(false);
    });

    it('should use custom SLA when provided', () => {
        const intervention = createMockIntervention({
            type: 'DEPANNAGE',
            status: 'COMPLETED',
            startTime: '2025-12-22T10:00:00Z',
            endTime: '2025-12-22T12:00:00Z' // 2 hours
        });
        
        expect(isOverSLA(intervention, 1)).toBe(true); // 1h SLA exceeded
        expect(isOverSLA(intervention, 3)).toBe(false); // 3h SLA not exceeded
    });

    it('should return false for non-completed interventions', () => {
        const intervention = createMockIntervention({
            type: 'DEPANNAGE',
            status: 'IN_PROGRESS',
            startTime: '2025-12-22T10:00:00Z',
            endTime: '2025-12-22T20:00:00Z' // 10 hours but not completed
        });
        
        expect(isOverSLA(intervention)).toBe(false);
    });
});

// ============================================================================
// COLOR CODING TESTS
// ============================================================================
describe('getResolutionTimeColor', () => {
    describe('DEPANNAGE (urgent)', () => {
        it('should return green for <= 1h', () => {
            expect(getResolutionTimeColor(30, 'DEPANNAGE')).toBe('text-green-600');
            expect(getResolutionTimeColor(60, 'DEPANNAGE')).toBe('text-green-600');
        });

        it('should return orange for 1-3h', () => {
            expect(getResolutionTimeColor(90, 'DEPANNAGE')).toBe('text-orange-500');
            expect(getResolutionTimeColor(180, 'DEPANNAGE')).toBe('text-orange-500');
        });

        it('should return red for > 3h', () => {
            expect(getResolutionTimeColor(200, 'DEPANNAGE')).toBe('text-red-600');
            expect(getResolutionTimeColor(300, 'DEPANNAGE')).toBe('text-red-600');
        });
    });

    describe('INSTALLATION (normal)', () => {
        it('should return green for <= 2h', () => {
            expect(getResolutionTimeColor(60, 'INSTALLATION')).toBe('text-green-600');
            expect(getResolutionTimeColor(120, 'INSTALLATION')).toBe('text-green-600');
        });

        it('should return orange for 2-6h', () => {
            expect(getResolutionTimeColor(180, 'INSTALLATION')).toBe('text-orange-500');
            expect(getResolutionTimeColor(360, 'INSTALLATION')).toBe('text-orange-500');
        });

        it('should return red for > 6h', () => {
            expect(getResolutionTimeColor(400, 'INSTALLATION')).toBe('text-red-600');
        });
    });

    describe('Edge Cases', () => {
        it('should return slate for null', () => {
            expect(getResolutionTimeColor(null)).toBe('text-slate-400');
        });

        it('should use default thresholds when type is undefined', () => {
            expect(getResolutionTimeColor(100, undefined)).toBe('text-green-600');
            expect(getResolutionTimeColor(200, undefined)).toBe('text-orange-500');
        });
    });
});

// ============================================================================
// INTERVENTION SCHEMA VALIDATION TESTS
// ============================================================================
describe('InterventionSchema Validation', () => {
    describe('Required Fields', () => {
        it('should require clientId', () => {
            const result = InterventionSchema.safeParse({
                clientId: '',
                technicianId: 'TECH-001',
                type: 'INSTALLATION',
                scheduledDate: '2025-12-22',
                location: 'Test'
            });
            
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some(i => 
                    i.path.includes('clientId')
                )).toBe(true);
            }
        });

        it('should accept optional scheduledDate', () => {
            const result = InterventionSchema.safeParse({
                clientId: 'CLI-001',
                technicianId: 'TECH-001',
                type: 'INSTALLATION',
                scheduledDate: '',
                location: 'Test'
            });
            
            // scheduledDate is now optional in the schema
            expect(result.success).toBe(true);
        });

        it('should accept optional location', () => {
            const result = InterventionSchema.safeParse({
                clientId: 'CLI-001',
                technicianId: 'TECH-001',
                type: 'INSTALLATION',
                scheduledDate: '2025-12-22',
                location: ''
            });
            
            // location is now optional in the schema
            expect(result.success).toBe(true);
        });
    });

    describe('Type Validation', () => {
        it('should accept valid intervention types', () => {
            const validTypes = ['INSTALLATION', 'DEPANNAGE', 'MAINTENANCE', 'DESINSTALLATION', 'VERIFICATION', 'AUTRE'];
            
            validTypes.forEach(type => {
                const result = InterventionSchema.safeParse({
                    clientId: 'CLI-001',
                    technicianId: 'TECH-001',
                    type,
                    scheduledDate: '2025-12-22',
                    location: 'Test'
                });
                expect(result.success).toBe(true);
            });
        });

        it('should reject invalid intervention type', () => {
            const result = InterventionSchema.safeParse({
                clientId: 'CLI-001',
                technicianId: 'TECH-001',
                type: 'INVALID_TYPE',
                scheduledDate: '2025-12-22',
                location: 'Test'
            });
            
            expect(result.success).toBe(false);
        });
    });

    describe('Status Validation', () => {
        it('should accept valid statuses', () => {
            const validStatuses = ['PENDING', 'SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'];
            
            validStatuses.forEach(status => {
                const result = InterventionSchema.safeParse({
                    clientId: 'CLI-001',
                    technicianId: 'TECH-001',
                    type: 'INSTALLATION',
                    status,
                    scheduledDate: '2025-12-22',
                    location: 'Test'
                });
                expect(result.success).toBe(true);
            });
        });

        it('should default to PENDING if no status provided', () => {
            const result = InterventionSchema.safeParse({
                clientId: 'CLI-001',
                technicianId: 'TECH-001',
                type: 'INSTALLATION',
                scheduledDate: '2025-12-22',
                location: 'Test'
            });
            
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.status).toBe('PENDING');
            }
        });
    });

    describe('Numeric Fields', () => {
        it('should require positive duration', () => {
            const result = InterventionSchema.safeParse({
                clientId: 'CLI-001',
                technicianId: 'TECH-001',
                type: 'INSTALLATION',
                scheduledDate: '2025-12-22',
                location: 'Test',
                duration: -10
            });
            
            expect(result.success).toBe(false);
        });

        it('should reject negative cost', () => {
            const result = InterventionSchema.safeParse({
                clientId: 'CLI-001',
                technicianId: 'TECH-001',
                type: 'INSTALLATION',
                scheduledDate: '2025-12-22',
                location: 'Test',
                cost: -100
            });
            
            expect(result.success).toBe(false);
        });

        it('should accept valid tank dimensions', () => {
            const result = InterventionSchema.safeParse({
                clientId: 'CLI-001',
                technicianId: 'TECH-001',
                type: 'INSTALLATION',
                scheduledDate: '2025-12-22',
                location: 'Test',
                tankCapacity: 100,
                tankHeight: 50,
                tankWidth: 40,
                tankLength: 60
            });
            
            expect(result.success).toBe(true);
        });
    });

    describe('VIN Validation', () => {
        it('should accept VIN with 17 characters', () => {
            const result = InterventionSchema.safeParse({
                clientId: 'CLI-001',
                technicianId: 'TECH-001',
                type: 'INSTALLATION',
                scheduledDate: '2025-12-22',
                location: 'Test',
                vin: '1HGBH41JXMN109186' // 17 chars
            });
            
            expect(result.success).toBe(true);
        });

        it('should reject VIN over 17 characters', () => {
            const result = InterventionSchema.safeParse({
                clientId: 'CLI-001',
                technicianId: 'TECH-001',
                type: 'INSTALLATION',
                scheduledDate: '2025-12-22',
                location: 'Test',
                vin: '1HGBH41JXMN109186X' // 18 chars
            });
            
            expect(result.success).toBe(false);
        });
    });

    describe('Fuel Sensor Type', () => {
        it('should accept valid sensor types', () => {
            const validTypes = ['CANBUS', 'CAPACITIVE', 'ULTRASONIC'];
            
            validTypes.forEach(sensorType => {
                const result = InterventionSchema.safeParse({
                    clientId: 'CLI-001',
                    technicianId: 'TECH-001',
                    type: 'INSTALLATION',
                    scheduledDate: '2025-12-22',
                    location: 'Test',
                    fuelSensorType: sensorType
                });
                expect(result.success).toBe(true);
            });
        });
    });
});
