import { useEffect, useState } from 'react';
import { api } from '../services/apiLazy';

export interface InterventionTypeConfig {
  id: string;
  code: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  default_duration?: number;
  base_cost?: number;
  is_active?: boolean;
  display_order?: number;
}

export interface InterventionNatureConfig {
  id: string;
  typeId: string;
  code: string;
  label: string;
  description?: string;
  required_fields?: string[];
  stock_impact?: any;
  is_active?: boolean;
}

// Fallback minimal
const FALLBACK_TYPES: InterventionTypeConfig[] = [
  { id: 'fb-1', code: 'INSTALLATION', label: 'Installation' },
  { id: 'fb-2', code: 'DEPANNAGE', label: 'Dépannage' },
];

/**
 * Hook pour charger les types d'intervention depuis la DB (via /api/tech-settings/types).
 * Retourne { types, typeCodes, natures, loading }.
 */
export function useInterventionTypes() {
  const [types, setTypes] = useState<InterventionTypeConfig[]>(FALLBACK_TYPES);
  const [natures, setNatures] = useState<InterventionNatureConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [typesData, naturesData] = await Promise.all([
        api.techSettings.getTypes(),
        api.techSettings.getNatures()
      ]);

      if (Array.isArray(typesData) && typesData.length > 0) {
        // Deduplicate by code to prevent UI clutter if multiple versions exist
        const uniqueTypes: InterventionTypeConfig[] = [];
        const seenCodes = new Set<string>();
        
        typesData
          .filter(t => t.is_active !== false)
          .forEach(t => {
            if (!seenCodes.has(t.code)) {
              seenCodes.add(t.code);
              uniqueTypes.push(t);
            }
          });

        setTypes(uniqueTypes);
      }
      
      if (Array.isArray(naturesData)) {
        setNatures(naturesData
          .filter(n => n.is_active !== false)
          .map(n => ({
            ...n,
            // Ensure compatibility between DB snake_case and frontend camelCase
            typeId: n.typeId || n.type_id
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching intervention settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const typeCodes = types.map(t => t.code);

  return { types, typeCodes, natures, loading, refresh: fetchData };
}
