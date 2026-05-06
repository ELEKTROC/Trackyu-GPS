/**
 * TowProvidersPanel - Gestion des Dépanneurs (liste globale)
 *
 * Utilisé par le module Services mobile : auto-dispatch de 3 dépanneurs
 * lors d'une demande de dépannage (proximité GPS ou ville).
 *
 * Liste NON multi-tenant : partagée par toutes les organisations.
 * Accès : ADMIN / SUPERADMIN uniquement.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, Edit2, Trash2, Search, Phone, Mail, MapPin, Loader2, X, Save, AlertCircle } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { api } from '../../../../services/apiLazy';
import { useToast } from '../../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../../components/ConfirmDialog';
import { mapError } from '../../../../utils/errorMapper';

interface TowProvider {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  coverage_km: number | null;
  priority: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type ProviderForm = Omit<TowProvider, 'id' | 'created_at' | 'updated_at'>;

const EMPTY: ProviderForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  region: '',
  lat: null,
  lng: null,
  coverage_km: 30,
  priority: 100,
  active: true,
  notes: '',
};

export const TowProvidersPanel: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [editing, setEditing] = useState<TowProvider | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ProviderForm>(EMPTY);

  const { data: providers = [], isLoading } = useQuery<TowProvider[]>({
    queryKey: ['tow-providers', { search, cityFilter, onlyActive }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (cityFilter) params.city = cityFilter;
      if (onlyActive) params.active = 'true';
      const r = await api.get<TowProvider[]>('/tow-providers', { params });
      return r.data || [];
    },
  });

  const createMut = useMutation({
    mutationFn: async (body: ProviderForm) => {
      const r = await api.post<TowProvider>('/tow-providers', body);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tow-providers'] });
      showToast('Dépanneur ajouté', 'success');
      setCreating(false);
      setForm(EMPTY);
    },
    onError: (e) => showToast(mapError(e), 'error'),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: ProviderForm }) => {
      const r = await api.put<TowProvider>(`/tow-providers/${id}`, body);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tow-providers'] });
      showToast('Dépanneur mis à jour', 'success');
      setEditing(null);
    },
    onError: (e) => showToast(mapError(e), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tow-providers/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tow-providers'] });
      showToast('Dépanneur supprimé', 'success');
    },
    onError: (e) => showToast(mapError(e), 'error'),
  });

  const startEdit = (p: TowProvider) => {
    setForm({
      name: p.name,
      phone: p.phone,
      email: p.email ?? '',
      address: p.address ?? '',
      city: p.city ?? '',
      region: p.region ?? '',
      lat: p.lat,
      lng: p.lng,
      coverage_km: p.coverage_km ?? 30,
      priority: p.priority ?? 100,
      active: p.active,
      notes: p.notes ?? '',
    });
    setEditing(p);
    setCreating(false);
  };

  const startCreate = () => {
    setForm(EMPTY);
    setCreating(true);
    setEditing(null);
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm(EMPTY);
  };

  const submit = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      showToast('Nom et téléphone obligatoires', 'error');
      return;
    }
    const body: ProviderForm = {
      ...form,
      lat: form.lat != null && !isNaN(Number(form.lat)) ? Number(form.lat) : null,
      lng: form.lng != null && !isNaN(Number(form.lng)) ? Number(form.lng) : null,
      coverage_km: form.coverage_km != null ? Number(form.coverage_km) : 30,
      priority: form.priority != null ? Number(form.priority) : 100,
    };
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  };

  const handleDelete = async (p: TowProvider) => {
    const ok = await confirm({
      title: 'Supprimer ce dépanneur ?',
      message: `${p.name} — cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (ok) deleteMut.mutate(p.id);
  };

  const isFormOpen = editing !== null || creating;

  return (
    <div className="space-y-4">
      <ConfirmDialogComponent />

      <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
        <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[var(--primary)]" />
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Dépanneurs (liste globale)</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Répertoire partagé utilisé pour l'auto-dispatch des demandes de dépannage mobiles.
              </p>
            </div>
          </div>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>

        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher (nom, téléphone, ville)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
            />
          </div>
          <input
            type="text"
            placeholder="Ville…"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
          />
          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="w-4 h-4"
            />
            Actifs uniquement
          </label>
        </div>
      </Card>

      {isFormOpen && (
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h4 className="font-semibold text-[var(--text-primary)]">
              {editing ? `Modifier — ${editing.name}` : 'Nouveau dépanneur'}
            </h4>
            <button onClick={cancel} className="p-1 hover:bg-[var(--bg-hover)] rounded" aria-label="Fermer">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nom *" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Téléphone *" required>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+225 07 00 00 00 00"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Ville">
              <input
                type="text"
                value={form.city ?? ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Région">
              <input
                type="text"
                value={form.region ?? ''}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Adresse">
              <input
                type="text"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Latitude">
              <input
                type="number"
                step="0.000001"
                value={form.lat ?? ''}
                onChange={(e) => setForm({ ...form, lat: e.target.value === '' ? null : Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="0.000001"
                value={form.lng ?? ''}
                onChange={(e) => setForm({ ...form, lng: e.target.value === '' ? null : Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Rayon couverture (km)">
              <input
                type="number"
                min={1}
                value={form.coverage_km ?? 30}
                onChange={(e) => setForm({ ...form, coverage_km: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Priorité (plus bas = prioritaire)">
              <input
                type="number"
                value={form.priority ?? 100}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea
                  rows={2}
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputClass + ' resize-none'}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4"
              />
              Actif (inclus dans l'auto-dispatch)
            </label>
          </div>
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
            <button
              onClick={cancel}
              className="px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)]"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={createMut.isPending || updateMut.isPending}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
            >
              {createMut.isPending || updateMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </Card>
      )}

      <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : providers.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-[var(--text-muted)]">Aucun dépanneur enregistré.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-surface)] text-left text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Contact</th>
                  <th className="px-4 py-2 font-medium">Localisation</th>
                  <th className="px-4 py-2 font-medium">Couv.</th>
                  <th className="px-4 py-2 font-medium">Prio.</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text-primary)]">{p.name}</div>
                      {p.notes && <div className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{p.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[var(--text-muted)]" />
                        {p.phone}
                      </div>
                      {p.email && (
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-0.5">
                          <Mail className="w-3 h-3" />
                          {p.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {(p.city || p.region) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[var(--text-muted)]" />
                          {[p.city, p.region].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {p.lat != null && p.lng != null && (
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{p.coverage_km ?? 30} km</td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{p.priority ?? 100}</td>
                    <td className="px-4 py-3">
                      {p.active ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--clr-success-muted)] text-[var(--clr-success)]">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)]">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 hover:bg-[var(--bg-surface)] rounded"
                          aria-label={`Modifier ${p.name}`}
                        >
                          <Edit2 className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deleteMut.isPending}
                          className="p-1.5 hover:bg-[var(--bg-surface)] rounded disabled:opacity-50"
                          aria-label={`Supprimer ${p.name}`}
                        >
                          <Trash2 className="w-4 h-4 text-[var(--clr-danger)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

const inputClass =
  'w-full px-3 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]';

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  required,
  children,
}) => (
  <div>
    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
      {label}
      {required && <span className="text-[var(--clr-danger)] ml-1">*</span>}
    </label>
    {children}
  </div>
);

export default TowProvidersPanel;
