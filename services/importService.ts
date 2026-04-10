import Papa from 'papaparse';

export interface ImportResult<T> {
  data: T[];
  errors: string[];
  meta: {
    total: number;
    success: number;
    failed: number;
  };
}

export const parseCSV = <T>(file: File, requiredColumns: string[]): Promise<ImportResult<T>> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data: T[] = [];
        const errors: string[] = [];
        
        // Validate headers
        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          resolve({
            data: [],
            errors: [`Colonnes manquantes: ${missingColumns.join(', ')}`],
            meta: { total: 0, success: 0, failed: 0 }
          });
          return;
        }

        // Process rows
        results.data.forEach((row: any, index) => {
            // Basic validation: check if required fields are not empty
            const missingFields = requiredColumns.filter(col => !row[col] || row[col].toString().trim() === '');
            
            if (missingFields.length === 0) {
                data.push(row as T);
            } else {
                errors.push(`Ligne ${index + 2}: Champs manquants (${missingFields.join(', ')})`);
            }
        });

        resolve({
          data,
          errors,
          meta: {
            total: results.data.length,
            success: data.length,
            failed: errors.length
          }
        });
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
