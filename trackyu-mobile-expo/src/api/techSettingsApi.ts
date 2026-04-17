/**
 * TrackYu Mobile — Tech Settings API
 * GET /api/tech-settings/types   → intervention_type_configs
 * GET /api/tech-settings/natures → intervention_nature_configs (optionnel: ?typeId=)
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export interface InterventionTypeConfig {
  id: string;
  code: string;
  label: string;
  description?: string;
  color?: string;
  default_duration?: number;
  base_cost?: number;
  is_active?: boolean;
  display_order?: number;
}

export interface InterventionNatureConfig {
  id: string;
  type_id: string;
  code: string;
  label: string;
  description?: string;
  required_fields?: string[];
  stock_impact?: { action: string; items: string[] };
  is_active?: boolean;
}

const techSettingsApi = {
  getTypes: async (): Promise<InterventionTypeConfig[]> => {
    try {
      const res = await apiClient.get('/tech-settings/types');
      const data: InterventionTypeConfig[] = Array.isArray(res.data) ? res.data : [];
      return data.filter((t) => t.is_active !== false);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  getNatures: async (typeId?: string): Promise<InterventionNatureConfig[]> => {
    try {
      const params = typeId ? { typeId } : {};
      const res = await apiClient.get('/tech-settings/natures', { params });
      const data: InterventionNatureConfig[] = Array.isArray(res.data) ? res.data : [];
      return data.filter((n) => n.is_active !== false);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export default techSettingsApi;
