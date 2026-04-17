/**
 * TrackYu Mobile — Stock API
 * Aligne avec /api/stock-movements (backend techRoutes/stockRoutes)
 * Requiert VIEW_STOCK
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type StockMovementType = 'ENTRY' | 'TRANSFER' | 'INSTALLATION' | 'REMOVAL' | 'RMA' | 'STATUS_CHANGE';

export interface StockMovement {
  id: string;
  tenantId: string;
  deviceId: string;
  date: string;
  type: StockMovementType;
  fromLocation?: string;
  toLocation?: string;
  fromStatus?: string;
  toStatus?: string;
  userId: string;
  performedBy?: string;
  details?: string;
  notes?: string;
}

const stockApi = {
  getAll: async (): Promise<StockMovement[]> => {
    try {
      const res = await apiClient.get('/stock-movements', { params: { limit: 500 } });
      if (Array.isArray(res.data?.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      return [];
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export default stockApi;
