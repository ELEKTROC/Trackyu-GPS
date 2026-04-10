import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Vehicle } from '../../../types';
import { Card } from '../../../components/Card';

interface FuelChartProps {
  vehicles: Vehicle[];
}

export const FuelChart: React.FC<FuelChartProps> = ({ vehicles }) => {
  const data = vehicles.map(v => ({
    name: v.id,
    fuel: v.fuelLevel,
  }));

  return (
    <Card title="Niveaux de Carburant" className="h-full">
      <div className="h-[250px] w-full" style={{ minHeight: 200, minWidth: 200 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200} initialDimension={{ width: 200, height: 200 }}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
            />
            <Tooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="fuel" radius={[4, 4, 0, 0]} barSize={30}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fuel < 20 ? '#ef4444' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};