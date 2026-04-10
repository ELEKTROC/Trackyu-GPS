// services/api/tech.ts — Tech domain: stock, interventions, techs, techSettings, discoveredDevices
import {
  USE_MOCK,
  NETWORK_DELAY,
  API_URL,
  DB_KEYS,
  db,
  sleep,
  filterByTenant,
  getHeaders,
  handleAuthError,
} from './client';
import { logger } from '../../utils/logger';
import type { DeviceStock, Intervention, Tech } from '../../types';

export function createTechApi(lazyApi: () => any) {
  // --- TECHS (self-referencing) ---
  const techsApi = {
    getAll: async (): Promise<Tech[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.TECHS);
        if (stored) return JSON.parse(stored);
        return [];
      }
      const response = await fetch(`${API_URL}/techs`, { headers: getHeaders() });
      return response.json();
    },
    create: async (tech: Tech): Promise<Tech> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const techs = await techsApi.getAll();
        const newTech = { ...tech, id: tech.id || `TCH-${Date.now()}` };
        techs.push(newTech);
        localStorage.setItem(DB_KEYS.TECHS, JSON.stringify(techs));
        return newTech;
      }
      const response = await fetch(`${API_URL}/techs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tech),
      });
      return response.json();
    },
    update: async (tech: Tech): Promise<Tech> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const techs = await techsApi.getAll();
        const index = techs.findIndex((t) => t.id === tech.id);
        if (index !== -1) {
          techs[index] = tech;
          localStorage.setItem(DB_KEYS.TECHS, JSON.stringify(techs));
          return tech;
        }
        throw new Error('Tech not found');
      }
      const response = await fetch(`${API_URL}/techs/${tech.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tech),
      });
      return response.json();
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const techs = await techsApi.getAll();
        const filtered = techs.filter((t) => t.id !== id);
        localStorage.setItem(DB_KEYS.TECHS, JSON.stringify(filtered));
        return;
      }
      await fetch(`${API_URL}/techs/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
    // Alias for compatibility
    list: async (tenantId?: string): Promise<Tech[]> => techsApi.getAll(),
  };

  return {
    // --- STOCK ---
    stock: {
      list: async (tenantId?: string): Promise<DeviceStock[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return db.get(DB_KEYS.STOCK, [] as DeviceStock[]);
        }
        const response = await fetch(`${API_URL}/devices`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch devices');
        const rawData = await response.json();
        return rawData.map((d: any) => ({
          id: d.id,
          tenantId: d.tenant_id,
          imei: d.imei,
          iccid: d.iccid,
          phoneNumber: d.phone_number,
          model: d.type === 'SIM' ? d.operator || 'SIM' : d.model,
          operator: d.operator,
          status: d.status,
          assignedClientId: d.assigned_client_id,
          assignedVehicleId: d.assigned_vehicle_id,
          client: d.client_name || undefined,
          vehicleName: d.vehicle_name || undefined,
          vehiclePlate: d.vehicle_plate || undefined,
          type: d.type === 'SIM' ? 'SIM' : d.type === 'GPS_TRACKER' || !d.type ? 'BOX' : d.type,
          serialNumber: d.type === 'SIM' ? d.iccid || d.phone_number || d.id : d.serial_number || d.imei || 'UNKNOWN',
          location: d.location || 'CENTRAL',
          technicianId: d.technician_id,
          transferStatus: d.transfer_status,
          entryDate: d.entry_date || d.activation_date,
          notes: d.notes,
          resellerId: d.reseller_id,
          resellerName: d.reseller_name,
        }));
      },
      create: async (device: DeviceStock): Promise<DeviceStock> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const devices = db.get(DB_KEYS.STOCK, [] as DeviceStock[]);
          const newDevice = { ...device, id: device.id || device.imei || `DEV-${Date.now()}` };
          db.save(DB_KEYS.STOCK, [...devices, newDevice]);
          return newDevice;
        }
        const response = await fetch(`${API_URL}/devices`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(device),
        });
        if (!response.ok) throw new Error('Failed to create device');
        const rawData = await response.json();
        return {
          id: rawData.id,
          tenantId: rawData.tenant_id,
          imei: rawData.imei,
          iccid: rawData.iccid,
          phoneNumber: rawData.phone_number,
          operator: rawData.operator,
          model: rawData.type === 'SIM' ? rawData.operator || 'SIM' : rawData.model,
          status: rawData.status,
          simCardId: rawData.sim_card_id,
          assignedClientId: rawData.assigned_client_id,
          assignedVehicleId: rawData.assigned_vehicle_id,
          type: rawData.type === 'SIM' ? 'SIM' : rawData.type || 'BOX',
          serialNumber:
            rawData.type === 'SIM'
              ? rawData.iccid || rawData.phone_number || rawData.id
              : rawData.serial_number || rawData.imei || 'UNKNOWN',
          location: rawData.location || 'CENTRAL',
        };
      },
      update: async (device: DeviceStock): Promise<DeviceStock> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const devices = db.get(DB_KEYS.STOCK, [] as DeviceStock[]);
          const index = devices.findIndex((d) => d.id === device.id);
          if (index !== -1) {
            devices[index] = device;
            db.save(DB_KEYS.STOCK, devices);
            return device;
          }
          throw new Error('Device not found');
        }
        const response = await fetch(`${API_URL}/devices/${device.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(device),
        });
        if (!response.ok) throw new Error('Failed to update device');
        const rawData = await response.json();
        return {
          id: rawData.id,
          tenantId: rawData.tenant_id,
          imei: rawData.imei,
          iccid: rawData.iccid,
          phoneNumber: rawData.phone_number,
          operator: rawData.operator,
          model: rawData.type === 'SIM' ? rawData.operator || 'SIM' : rawData.model,
          status: rawData.status,
          simCardId: rawData.sim_card_id,
          assignedClientId: rawData.assigned_client_id,
          assignedVehicleId: rawData.assigned_vehicle_id,
          client: rawData.client_name || undefined,
          vehicleName: rawData.vehicle_name || undefined,
          vehiclePlate: rawData.vehicle_plate || undefined,
          resellerId: rawData.reseller_id,
          resellerName: rawData.reseller_name,
          type: rawData.type === 'SIM' ? 'SIM' : rawData.type || 'BOX',
          serialNumber:
            rawData.type === 'SIM'
              ? rawData.iccid || rawData.phone_number || rawData.id
              : rawData.serial_number || rawData.imei || 'UNKNOWN',
          location: rawData.location || 'CENTRAL',
          technicianId: rawData.technician_id,
          transferStatus: rawData.transfer_status,
        };
      },
      delete: async (id: string): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const devices = db.get(DB_KEYS.STOCK, [] as DeviceStock[]);
          const filtered = devices.filter((d) => d.id !== id);
          db.save(DB_KEYS.STOCK, filtered);
          return;
        }
        const response = await fetch(`${API_URL}/devices/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete device');
      },
    },

    // --- INTERVENTIONS ---
    interventions: {
      list: async (tenantId?: string): Promise<Intervention[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return db.get(DB_KEYS.INTERVENTIONS, [] as Intervention[]);
        }
        try {
          const response = await fetch(`${API_URL}/tech/interventions`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch interventions');
          const rawData = await response.json();
          return rawData.map((i: any) => ({
            id: i.id,
            tenantId: i.tenant_id,
            ticketId: i.ticket_id,
            createdAt: i.created_at,
            vehicleId: i.vehicle_id,
            clientId: i.client_id,
            contactPhone: i.contact_phone || '',
            technicianId: i.technician_id,
            type: i.type,
            nature: i.nature,
            status: i.status,
            scheduledDate: i.scheduled_date,
            duration: i.duration || 60,
            location: i.location || '',
            cost: parseFloat(i.cost || '0'),
            licensePlate: i.license_plate || '',
            tempPlate: i.temp_plate || '',
            vin: i.vin || '',
            vehicleName: i.vehicle_name || '',
            vehicleType: i.vehicle_type || '',
            vehicleBrand: i.vehicle_brand || '',
            vehicleModel: i.vehicle_model || '',
            vehicleYear: i.vehicle_year || '',
            vehicleColor: i.vehicle_color || '',
            vehicleMileage: i.vehicle_mileage || 0,
            engineHours: i.engine_hours || 0,
            checkStart: i.checkStart ?? i.check_start ?? false,
            checkLights: i.checkLights ?? i.check_lights ?? false,
            checkDashboard: i.checkDashboard ?? i.check_dashboard ?? false,
            checkAC: i.checkAC ?? i.check_ac ?? false,
            checkAudio: i.checkAudio ?? i.check_audio ?? false,
            checkBattery: i.checkBattery ?? i.check_battery ?? false,
            observations: i.observations || '',
            notes: i.notes || '',
            description: i.description || i.notes || '',
            material: i.material || [],
            imei: i.imei || '',
            simCard: i.sim_card || '',
            iccid: i.iccid || '',
            deviceLocation: i.device_location || '',
            newSim: i.new_sim || '',
            newImei: i.new_imei || '',
            newGaugeSerial: i.new_gauge_serial || '',
            newLicensePlate: i.new_license_plate || '',
            targetVehicleId: i.target_vehicle_id || '',
            targetPlate: i.target_plate || '',
            isClientTransfer: i.is_client_transfer || false,
            mutationInvoiceId: i.mutation_invoice_id || '',
            oldDeviceImei: i.old_device_imei || '',
            oldSimId: i.old_sim_id || '',
            removedMaterialStatus: i.removed_material_status || '',
            tankCapacity: i.tank_capacity || 0,
            tankHeight: i.tank_height || 0,
            tankWidth: i.tank_width || 0,
            tankLength: i.tank_length || 0,
            tankShape: i.tank_shape || '',
            fuelSensorType: i.fuel_sensor_type || '',
            calibrationTable: i.calibration_table || '',
            refillThreshold: i.refill_threshold || 0,
            theftThreshold: i.theft_threshold || 0,
            gaugeVoltage: i.gauge_voltage || '',
            gaugeBrand: i.gauge_brand || '',
            gaugeModel: i.gauge_model || '',
            gaugeSerial: i.gauge_serial || '',
            gaugeTest: i.gauge_test || '',
            sensorSerial: i.sensor_serial || '',
            signatureTech: i.signature_tech || '',
            signatureClient: i.signature_client || '',
            photos: i.photos || [],
            resellerName: i.reseller_name || '',
            resellerId: i.reseller_id || '',
            contractId: i.contract_id || '',
            startTime: i.start_time || '',
            endTime: i.end_time || '',
            enRouteTime: i.en_route_time || '',
            paymentReceived: parseFloat(i.payment_received || '0'),
            paymentDeposited: i.payment_deposited || false,
          }));
        } catch (e) {
          logger.error('API Error (interventions):', e);
          throw e;
        }
      },
      create: async (intervention: Intervention): Promise<Intervention> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const interventions = db.get(DB_KEYS.INTERVENTIONS, [] as Intervention[]);
          const newIntervention = { ...intervention, id: `INT-${Date.now()}`, createdAt: new Date().toISOString() };
          interventions.push(newIntervention);
          db.save(DB_KEYS.INTERVENTIONS, interventions);
          return newIntervention;
        }
        try {
          const response = await fetch(`${API_URL}/tech/interventions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(intervention),
          });
          if (!response.ok) throw new Error('Failed to create intervention');
          const i = await response.json();
          return {
            id: i.id,
            tenantId: i.tenant_id,
            ticketId: i.ticket_id,
            createdAt: i.created_at,
            vehicleId: i.vehicle_id,
            clientId: i.client_id,
            contactPhone: i.contact_phone || '',
            technicianId: i.technician_id,
            type: i.type,
            nature: i.nature,
            status: i.status,
            scheduledDate: i.scheduled_date,
            duration: i.duration || 60,
            location: i.location || '',
            cost: parseFloat(i.cost || '0'),
            licensePlate: i.license_plate || '',
            tempPlate: i.temp_plate || '',
            vin: i.vin || '',
            vehicleName: i.vehicle_name || '',
            vehicleType: i.vehicle_type || '',
            vehicleBrand: i.vehicle_brand || '',
            vehicleModel: i.vehicle_model || '',
            vehicleYear: i.vehicle_year || '',
            vehicleColor: i.vehicle_color || '',
            vehicleMileage: i.vehicle_mileage || 0,
            engineHours: i.engine_hours || 0,
            checkStart: i.checkStart ?? i.check_start ?? false,
            checkLights: i.checkLights ?? i.check_lights ?? false,
            checkDashboard: i.checkDashboard ?? i.check_dashboard ?? false,
            checkAC: i.checkAC ?? i.check_ac ?? false,
            checkAudio: i.checkAudio ?? i.check_audio ?? false,
            checkBattery: i.checkBattery ?? i.check_battery ?? false,
            observations: i.observations || '',
            notes: i.notes || '',
            description: i.description || i.notes || '',
            material: i.material || [],
            imei: i.imei || '',
            simCard: i.sim_card || '',
            iccid: i.iccid || '',
            deviceLocation: i.device_location || '',
            newSim: i.new_sim || '',
            newImei: i.new_imei || '',
            newGaugeSerial: i.new_gauge_serial || '',
            newLicensePlate: i.new_license_plate || '',
            targetVehicleId: i.target_vehicle_id || '',
            targetPlate: i.target_plate || '',
            isClientTransfer: i.is_client_transfer || false,
            mutationInvoiceId: i.mutation_invoice_id || '',
            oldDeviceImei: i.old_device_imei || '',
            oldSimId: i.old_sim_id || '',
            removedMaterialStatus: i.removed_material_status || '',
            tankCapacity: i.tank_capacity || 0,
            tankHeight: i.tank_height || 0,
            tankWidth: i.tank_width || 0,
            tankLength: i.tank_length || 0,
            tankShape: i.tank_shape || '',
            fuelSensorType: i.fuel_sensor_type || '',
            calibrationTable: i.calibration_table || '',
            refillThreshold: i.refill_threshold || 0,
            theftThreshold: i.theft_threshold || 0,
            gaugeVoltage: i.gauge_voltage || '',
            gaugeBrand: i.gauge_brand || '',
            gaugeModel: i.gauge_model || '',
            gaugeSerial: i.gauge_serial || '',
            gaugeTest: i.gauge_test || '',
            sensorSerial: i.sensor_serial || '',
            signatureTech: i.signature_tech || '',
            signatureClient: i.signature_client || '',
            photos: i.photos || [],
            resellerName: i.reseller_name || '',
            resellerId: i.reseller_id || '',
            contractId: i.contract_id || '',
            startTime: i.start_time || '',
            endTime: i.end_time || '',
            enRouteTime: i.en_route_time || '',
            paymentReceived: parseFloat(i.payment_received || '0'),
            paymentDeposited: i.payment_deposited || false,
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (intervention: Intervention): Promise<Intervention> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const interventions = db.get(DB_KEYS.INTERVENTIONS, [] as Intervention[]);
          const index = interventions.findIndex((i) => i.id === intervention.id);
          if (index !== -1) {
            interventions[index] = intervention;
            db.save(DB_KEYS.INTERVENTIONS, interventions);
            return intervention;
          }
          throw new Error('Intervention not found');
        }
        try {
          const response = await fetch(`${API_URL}/tech/interventions/${intervention.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(intervention),
          });
          if (!response.ok) throw new Error('Failed to update intervention');
          const i = await response.json();
          return {
            id: i.id,
            tenantId: i.tenant_id,
            ticketId: i.ticket_id,
            createdAt: i.created_at,
            vehicleId: i.vehicle_id,
            clientId: i.client_id,
            contactPhone: i.contact_phone || '',
            technicianId: i.technician_id,
            type: i.type,
            nature: i.nature,
            status: i.status,
            scheduledDate: i.scheduled_date,
            duration: i.duration || 60,
            location: i.location || '',
            cost: parseFloat(i.cost || '0'),
            licensePlate: i.license_plate || '',
            tempPlate: i.temp_plate || '',
            vin: i.vin || '',
            vehicleName: i.vehicle_name || '',
            vehicleType: i.vehicle_type || '',
            vehicleBrand: i.vehicle_brand || '',
            vehicleModel: i.vehicle_model || '',
            vehicleYear: i.vehicle_year || '',
            vehicleColor: i.vehicle_color || '',
            vehicleMileage: i.vehicle_mileage || 0,
            engineHours: i.engine_hours || 0,
            checkStart: i.checkStart ?? i.check_start ?? false,
            checkLights: i.checkLights ?? i.check_lights ?? false,
            checkDashboard: i.checkDashboard ?? i.check_dashboard ?? false,
            checkAC: i.checkAC ?? i.check_ac ?? false,
            checkAudio: i.checkAudio ?? i.check_audio ?? false,
            checkBattery: i.checkBattery ?? i.check_battery ?? false,
            observations: i.observations || '',
            notes: i.notes || '',
            description: i.description || i.notes || '',
            material: i.material || [],
            imei: i.imei || '',
            simCard: i.sim_card || '',
            iccid: i.iccid || '',
            deviceLocation: i.device_location || '',
            newSim: i.new_sim || '',
            newImei: i.new_imei || '',
            newGaugeSerial: i.new_gauge_serial || '',
            newLicensePlate: i.new_license_plate || '',
            targetVehicleId: i.target_vehicle_id || '',
            targetPlate: i.target_plate || '',
            isClientTransfer: i.is_client_transfer || false,
            mutationInvoiceId: i.mutation_invoice_id || '',
            oldDeviceImei: i.old_device_imei || '',
            oldSimId: i.old_sim_id || '',
            removedMaterialStatus: i.removed_material_status || '',
            tankCapacity: i.tank_capacity || 0,
            tankHeight: i.tank_height || 0,
            tankWidth: i.tank_width || 0,
            tankLength: i.tank_length || 0,
            tankShape: i.tank_shape || '',
            fuelSensorType: i.fuel_sensor_type || '',
            calibrationTable: i.calibration_table || '',
            refillThreshold: i.refill_threshold || 0,
            theftThreshold: i.theft_threshold || 0,
            gaugeVoltage: i.gauge_voltage || '',
            gaugeBrand: i.gauge_brand || '',
            gaugeModel: i.gauge_model || '',
            gaugeSerial: i.gauge_serial || '',
            gaugeTest: i.gauge_test || '',
            sensorSerial: i.sensor_serial || '',
            signatureTech: i.signature_tech || '',
            signatureClient: i.signature_client || '',
            photos: i.photos || [],
            resellerName: i.reseller_name || '',
            resellerId: i.reseller_id || '',
            contractId: i.contract_id || '',
            startTime: i.start_time || '',
            endTime: i.end_time || '',
            enRouteTime: i.en_route_time || '',
            paymentReceived: parseFloat(i.payment_received || '0'),
            paymentDeposited: i.payment_deposited || false,
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const interventions = db.get(DB_KEYS.INTERVENTIONS, [] as Intervention[]);
          const filtered = interventions.filter((i) => i.id !== id);
          db.save(DB_KEYS.INTERVENTIONS, filtered);
          return;
        }
        try {
          const response = await fetch(`${API_URL}/tech/interventions/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to delete intervention');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
    },

    // --- TECHS ---
    techs: techsApi,

    // --- TECH SETTINGS (Configuration module interventions) ---
    techSettings: {
      getConfig: async () => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return {
            types: [],
            natures: [],
            sla: {
              criticalResponseTime: 2,
              highResponseTime: 8,
              mediumResponseTime: 24,
              lowResponseTime: 72,
              criticalCloseTime: 4,
              highCloseTime: 24,
              mediumCloseTime: 48,
              lowCloseTime: 72,
              alertBeforeDeadline: 60,
              autoEscalation: true,
              isCustom: false,
            },
            deviceModels: [],
            assignmentRules: [],
          };
        }
        const response = await fetch(`${API_URL}/tech-settings/config`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch tech config');
        return response.json();
      },
      // Types
      getTypes: async () => {
        if (USE_MOCK)
          return [
            {
              id: 'type-inst',
              code: 'INSTALLATION',
              label: 'Installation',
              is_active: true,
              default_duration: 60,
              base_cost: 0,
            },
            {
              id: 'type-dep',
              code: 'DEPANNAGE',
              label: 'Dépannage',
              is_active: true,
              default_duration: 30,
              base_cost: 0,
            },
          ];
        const response = await fetch(`${API_URL}/tech-settings/types`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch intervention types');
        return response.json();
      },
      createType: async (data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/types`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create intervention type');
        return response.json();
      },
      updateType: async (id: string, data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/types/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update intervention type');
        return response.json();
      },
      deleteType: async (id: string) => {
        const response = await fetch(`${API_URL}/tech-settings/types/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete intervention type');
      },
      // Natures
      getNatures: async (typeId?: string) => {
        if (USE_MOCK) {
          const natures = [
            { id: 'n-1', typeId: 'type-inst', code: 'BALISE', label: 'Balise', is_active: true },
            { id: 'n-2', typeId: 'type-inst', code: 'BALISE_RELAIS', label: 'Balise et relais', is_active: true },
            { id: 'n-3', typeId: 'type-inst', code: 'BALISE_JAUGE', label: 'Balise et jauge', is_active: true },
            { id: 'n-4', typeId: 'type-inst', code: 'JAUGE', label: 'jauge', is_active: true },
            { id: 'n-5', typeId: 'type-inst', code: 'REINSTALLATION', label: 'Reinstallation', is_active: true },
            {
              id: 'n-6',
              typeId: 'type-inst',
              code: 'BALISE_AUTRES',
              label: 'balise et autres accessoires',
              is_active: true,
            },
            { id: 'n-7', typeId: 'type-inst', code: 'ACCESSOIRES', label: 'Accessoires', is_active: true },
            { id: 'n-8', typeId: 'type-inst', code: 'INSTALLATION_SIMPLE', label: 'Installation', is_active: true },
            { id: 'n-9', typeId: 'type-dep', code: 'DEPANNAGE_SIMPLE', label: 'Dépannage', is_active: true },
            { id: 'n-10', typeId: 'type-dep', code: 'REPLACEMENT', label: 'Remplacement', is_active: true },
            { id: 'n-11', typeId: 'type-dep', code: 'TRANSFERT', label: 'Transfert', is_active: true },
            { id: 'n-12', typeId: 'type-dep', code: 'RETRAIT', label: 'Retrait', is_active: true },
          ];
          if (typeId) return natures.filter((n) => n.typeId === typeId);
          return natures;
        }
        const url = typeId ? `${API_URL}/tech-settings/natures?typeId=${typeId}` : `${API_URL}/tech-settings/natures`;
        const response = await fetch(url, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch intervention natures');
        return response.json();
      },
      createNature: async (data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/natures`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create intervention nature');
        return response.json();
      },
      updateNature: async (id: string, data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/natures/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update intervention nature');
        return response.json();
      },
      deleteNature: async (id: string) => {
        const response = await fetch(`${API_URL}/tech-settings/natures/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete intervention nature');
      },
      // SLA
      getSla: async () => {
        if (USE_MOCK) {
          return {
            criticalResponseTime: 2,
            highResponseTime: 8,
            mediumResponseTime: 24,
            lowResponseTime: 72,
            criticalCloseTime: 4,
            highCloseTime: 24,
            mediumCloseTime: 48,
            lowCloseTime: 72,
            alertBeforeDeadline: 60,
            autoEscalation: true,
            isCustom: false,
          };
        }
        const response = await fetch(`${API_URL}/tech-settings/sla`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch SLA config');
        return response.json();
      },
      updateSla: async (data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/sla`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update SLA config');
        return response.json();
      },
      // Device Models
      getDeviceModels: async (type?: string) => {
        if (USE_MOCK) return [];
        const url = type
          ? `${API_URL}/tech-settings/device-models?type=${type}`
          : `${API_URL}/tech-settings/device-models`;
        const response = await fetch(url, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch device models');
        return response.json();
      },
      createDeviceModel: async (data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/device-models`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create device model');
        return response.json();
      },
      updateDeviceModel: async (id: string, data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/device-models/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update device model');
        return response.json();
      },
      deleteDeviceModel: async (id: string) => {
        const response = await fetch(`${API_URL}/tech-settings/device-models/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete device model');
      },
      // Assignment Rules
      getAssignmentRules: async () => {
        if (USE_MOCK) return [];
        const response = await fetch(`${API_URL}/tech-settings/assignment-rules`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch assignment rules');
        return response.json();
      },
      createAssignmentRule: async (data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/assignment-rules`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create assignment rule');
        return response.json();
      },
      updateAssignmentRule: async (id: string, data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/assignment-rules/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update assignment rule');
        return response.json();
      },
      deleteAssignmentRule: async (id: string) => {
        const response = await fetch(`${API_URL}/tech-settings/assignment-rules/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete assignment rule');
      },
      // APN Profiles
      getApnProfiles: async (country?: string) => {
        if (USE_MOCK) return [];
        const url =
          country && country !== 'all'
            ? `${API_URL}/tech-settings/apn-profiles?country=${country}`
            : `${API_URL}/tech-settings/apn-profiles`;
        const response = await fetch(url, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch APN profiles');
        return response.json();
      },
      createApnProfile: async (data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/apn-profiles`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create APN profile');
        return response.json();
      },
      updateApnProfile: async (id: string, data: any) => {
        const response = await fetch(`${API_URL}/tech-settings/apn-profiles/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update APN profile');
        return response.json();
      },
      deleteApnProfile: async (id: string) => {
        const response = await fetch(`${API_URL}/tech-settings/apn-profiles/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete APN profile');
      },
      // GPS Server Config
      getGpsServerConfig: async () => {
        if (USE_MOCK) return { server_ip: '148.230.126.62', server_port: 5000 };
        const response = await fetch(`${API_URL}/tech-settings/gps-server-config`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch GPS server config');
        return response.json();
      },
    },

    // --- DISCOVERED DEVICES (Auto-discovery GPS) ---
    discoveredDevices: {
      list: async (status: string = 'PENDING') => {
        const response = await fetch(`${API_URL}/discovered-devices?status=${status}`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch discovered devices');
        return response.json();
      },
      approve: async (id: number, data: { model?: string; type?: string; notes?: string }) => {
        const response = await fetch(`${API_URL}/discovered-devices/${id}/approve`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to approve device');
        return response.json();
      },
      ignore: async (id: number, notes?: string) => {
        const response = await fetch(`${API_URL}/discovered-devices/${id}/ignore`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ notes }),
        });
        if (!response.ok) throw new Error('Failed to ignore device');
        return response.json();
      },
      delete: async (id: number) => {
        const response = await fetch(`${API_URL}/discovered-devices/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete discovered device');
        return response.json();
      },
    },

    // --- TECH API (Spare Parts) ---
    techApi: {
      getSpareParts: async () => {
        const response = await fetch(`${API_URL}/tech/parts`, { headers: getHeaders() });
        return response.json();
      },
      createSparePart: async (part: any) => {
        const response = await fetch(`${API_URL}/tech/parts`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(part),
        });
        return response.json();
      },
      updateSparePart: async (id: string, updates: any) => {
        const response = await fetch(`${API_URL}/tech/parts/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(updates),
        });
        return response.json();
      },
      // Fix 14: expose DELETE endpoint (was missing from API client)
      deleteSparePart: async (id: string) => {
        const response = await fetch(`${API_URL}/tech/parts/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete spare part');
      },
      getInterventionParts: async (interventionId: string) => {
        const response = await fetch(`${API_URL}/tech/interventions/${interventionId}/parts`, {
          headers: getHeaders(),
        });
        return response.json();
      },
      addInterventionPart: async (interventionId: string, part: any) => {
        const response = await fetch(`${API_URL}/tech/interventions/${interventionId}/parts`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(part),
        });
        return response.json();
      },
    },
  };
}
