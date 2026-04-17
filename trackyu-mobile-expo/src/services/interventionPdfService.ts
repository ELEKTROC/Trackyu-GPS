/**
 * TrackYu Mobile — Service PDF Interventions
 * Génère Bon d'intervention + Rapport d'intervention
 * via expo-print (HTML → PDF natif) + expo-sharing
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Intervention } from '../api/interventions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDateShort(iso?: string | null): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const COLOR_PRIMARY = '#F97316'; // orange TrackYu
const COLOR_DARK = '#111827';
const COLOR_GRAY = '#6B7280';
const COLOR_LIGHT = '#F9FAFB';
const COLOR_BORDER = '#E5E7EB';

// ── HTML base ─────────────────────────────────────────────────────────────────

function baseStyle(): string {
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 12px; color: ${COLOR_DARK}; padding: 20px; }
      h1  { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
      h2  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; background: ${COLOR_PRIMARY}; padding: 5px 10px; margin: 16px 0 8px; }
      h3  { font-size: 10px; font-weight: 700; color: ${COLOR_GRAY}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${COLOR_PRIMARY}; padding-bottom: 12px; margin-bottom: 16px; }
      .header-title { font-size: 13px; font-weight: 700; color: ${COLOR_PRIMARY}; }
      .header-ref { font-size: 10px; color: ${COLOR_GRAY}; margin-top: 2px; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
      .card { background: ${COLOR_LIGHT}; border: 1px solid ${COLOR_BORDER}; border-radius: 6px; padding: 10px; }
      .card label { font-size: 9px; font-weight: 700; color: ${COLOR_GRAY}; text-transform: uppercase; display: block; margin-bottom: 2px; }
      .card span { font-size: 12px; color: ${COLOR_DARK}; font-weight: 500; }
      .row { display: flex; gap: 6px; margin-bottom: 4px; }
      .row .lbl { color: ${COLOR_GRAY}; width: 110px; flex-shrink: 0; font-size: 10px; }
      .row .val { font-size: 11px; font-weight: 500; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
      th { background: ${COLOR_PRIMARY}; color: #fff; padding: 5px 8px; text-align: left; font-size: 9px; text-transform: uppercase; }
      td { padding: 5px 8px; border-bottom: 1px solid ${COLOR_BORDER}; }
      tr:nth-child(even) td { background: ${COLOR_LIGHT}; }
      .checklist-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid ${COLOR_BORDER}; }
      .checkbox { width: 14px; height: 14px; border: 1.5px solid ${COLOR_GRAY}; border-radius: 3px; flex-shrink: 0; }
      .checkbox.checked { background: #22C55E; border-color: #22C55E; }
      .sig-zone { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
      .sig-box { border: 1px solid ${COLOR_BORDER}; border-radius: 6px; padding: 8px; min-height: 80px; }
      .sig-title { font-size: 9px; font-weight: 700; text-transform: uppercase; color: ${COLOR_GRAY}; margin-bottom: 6px; }
      .sig-img { max-width: 100%; max-height: 70px; }
      .sig-line { border-bottom: 1px solid ${COLOR_BORDER}; margin: 30px 10px 4px; }
      .sig-name { font-size: 9px; color: ${COLOR_GRAY}; text-align: center; }
      .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid ${COLOR_BORDER}; font-size: 9px; color: ${COLOR_GRAY}; text-align: center; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; }
      .badge-orange { background: #FEF3C7; color: #D97706; }
      .badge-green  { background: #DCFCE7; color: #16A34A; }
      .badge-blue   { background: #DBEAFE; color: #2563EB; }
      .notes-box { background: ${COLOR_LIGHT}; border-left: 3px solid ${COLOR_PRIMARY}; padding: 8px 12px; font-size: 11px; line-height: 1.6; margin-bottom: 12px; white-space: pre-wrap; }
    </style>
  `;
}

function header(iv: Intervention, docType: 'BON' | 'RAPPORT'): string {
  const label = docType === 'BON' ? "BON D'INTERVENTION" : "RAPPORT D'INTERVENTION";
  return `
    <div class="header">
      <div>
        <div class="header-title">TrackYu GPS</div>
        <h1>${label}</h1>
        <div class="header-ref">Réf : ${iv.id} · ${fmtDateShort(iv.scheduledDate || iv.createdAt)}</div>
      </div>
      <div style="text-align:right">
        <div class="badge badge-orange">${iv.type || 'INTERVENTION'}</div>
        ${iv.nature ? `<div style="font-size:11px;font-weight:600;margin-top:4px">${iv.nature}</div>` : ''}
        ${iv.ticketId ? `<div style="font-size:9px;color:${COLOR_GRAY};margin-top:2px">Ticket : ${iv.ticketId}</div>` : ''}
      </div>
    </div>
  `;
}

function sectionTech(iv: Intervention, techName?: string): string {
  return `
    <h2>Technicien &amp; Client</h2>
    <div class="grid2">
      <div class="card">
        <label>Technicien</label>
        <span>${techName || iv.technicianId || 'Non assigné'}</span>
        <div style="font-size:10px;color:${COLOR_GRAY};margin-top:4px">Date : ${fmtDate(iv.scheduledDate)}</div>
        ${iv.duration ? `<div style="font-size:10px;color:${COLOR_GRAY}">Durée estimée : ${iv.duration} min</div>` : ''}
      </div>
      <div class="card">
        <label>Client</label>
        <span>${iv.clientName || '–'}</span>
        ${iv.contactPhone ? `<div style="font-size:10px;color:${COLOR_GRAY};margin-top:4px">Tél : ${iv.contactPhone}</div>` : ''}
        ${iv.location ? `<div style="font-size:10px;color:${COLOR_GRAY}">Lieu : ${iv.location}</div>` : ''}
      </div>
    </div>
  `;
}

function sectionVehicule(iv: Intervention): string {
  return `
    <h2>Véhicule concerné</h2>
    <div class="grid2">
      <div>
        <div class="row"><span class="lbl">Nom</span><span class="val">${iv.vehicleName || '–'}</span></div>
        <div class="row"><span class="lbl">Plaque immat.</span><span class="val">${iv.licensePlate || '–'}</span></div>
        ${iv.wwPlate ? `<div class="row"><span class="lbl">Plaque WW</span><span class="val">${iv.wwPlate}</span></div>` : ''}
        <div class="row"><span class="lbl">Type d'engin</span><span class="val">${iv.vehicleType || '–'}</span></div>
      </div>
      <div>
        <div class="row"><span class="lbl">Marque / Modèle</span><span class="val">${[iv.vehicleBrand, iv.vehicleModel].filter(Boolean).join(' ') || '–'}</span></div>
        ${iv.vehicleColor ? `<div class="row"><span class="lbl">Couleur</span><span class="val">${iv.vehicleColor}</span></div>` : ''}
        ${iv.vehicleYear ? `<div class="row"><span class="lbl">Année</span><span class="val">${iv.vehicleYear}</span></div>` : ''}
        ${iv.vehicleMileage !== undefined ? `<div class="row"><span class="lbl">Kilométrage</span><span class="val">${iv.vehicleMileage.toLocaleString('fr-FR')} km</span></div>` : ''}
      </div>
    </div>
  `;
}

function sectionTravaux(iv: Intervention): string {
  const material = iv.material?.length
    ? `<ul style="margin:6px 0 0 16px;font-size:11px">${iv.material.map((m) => `<li>${m}</li>`).join('')}</ul>`
    : '';
  return `
    <h2>Détails des travaux</h2>
    ${iv.description || iv.notes ? `<div class="notes-box">${iv.description || iv.notes}</div>` : ''}
    ${material ? `<h3>Matériel utilisé</h3>${material}` : ''}
  `;
}

function sectionChecklistBon(): string {
  const items = [
    'Vérification alimentation 12V',
    'Câblage OBD / alimentation',
    'Antenne GPS positionnée',
    'Test de transmission GPS',
    'Kit relais / coupure installé',
    'Photos installation réalisées',
    'Mise en service validée',
  ];
  return `
    <h2>Checklist sur site</h2>
    ${items.map((i) => `<div class="checklist-item"><div class="checkbox"></div><span>${i}</span></div>`).join('')}
  `;
}

function sectionTechnique(iv: Intervention): string {
  if (!iv.imei && !iv.simCard && !iv.iccid && !iv.sensorSerial && !iv.deviceLocation) return '';
  return `
    <h2>Données techniques</h2>
    <div class="grid2">
      <div>
        ${iv.imei ? `<div class="row"><span class="lbl">IMEI boîtier</span><span class="val">${iv.imei}</span></div>` : ''}
        ${iv.sensorSerial ? `<div class="row"><span class="lbl">N° sonde</span><span class="val">${iv.sensorSerial}</span></div>` : ''}
        ${iv.deviceLocation ? `<div class="row"><span class="lbl">Emplacement</span><span class="val">${iv.deviceLocation}</span></div>` : ''}
      </div>
      <div>
        ${iv.simCard || iv.sim ? `<div class="row"><span class="lbl">N° SIM</span><span class="val">${iv.simCard ?? iv.sim}</span></div>` : ''}
        ${iv.iccid ? `<div class="row"><span class="lbl">ICCID</span><span class="val">${iv.iccid}</span></div>` : ''}
        ${iv.fuelSensorType ? `<div class="row"><span class="lbl">Type sonde</span><span class="val">${iv.fuelSensorType}</span></div>` : ''}
      </div>
    </div>
  `;
}

function sectionCheckup(iv: Intervention): string {
  const checks: [string, boolean | undefined][] = [
    ['Démarrage moteur', iv.checkStart],
    ['Feux / Éclairage', iv.checkLights],
    ['Tableau de bord', iv.checkDashboard],
    ['Climatisation', iv.checkAC],
    ['Système audio', iv.checkAudio],
    ['Batterie', iv.checkBattery],
  ];
  const present = checks.filter(([, v]) => v !== undefined);
  if (!present.length) return '';
  return `
    <h2>Check-up véhicule</h2>
    ${present
      .map(
        ([l, v]) => `
      <div class="checklist-item">
        <div class="checkbox ${v ? 'checked' : ''}"></div>
        <span>${l}</span>
      </div>`
      )
      .join('')}
    ${iv.observations ? `<div style="margin-top:8px;font-size:10px;color:${COLOR_GRAY};font-style:italic">Observations : ${iv.observations}</div>` : ''}
  `;
}

function sectionSignatures(iv: Intervention, docType: 'BON' | 'RAPPORT'): string {
  if (docType === 'BON') {
    return `
      <div class="sig-zone">
        <div class="sig-box">
          <div class="sig-title">Signature Technicien</div>
          ${iv.signatureTech ? `<img src="${iv.signatureTech}" class="sig-img" />` : '<div class="sig-line"></div>'}
          <div class="sig-name">${'_'.repeat(30)}</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Signature Client</div>
          <div class="sig-line"></div>
          <div class="sig-name">${'_'.repeat(30)}</div>
        </div>
      </div>
    `;
  }
  return `
    <div class="sig-zone">
      <div class="sig-box">
        <div class="sig-title">Signature Technicien</div>
        ${
          iv.signatureTech
            ? `<img src="${iv.signatureTech}" class="sig-img" />`
            : '<div class="sig-line"></div><div class="sig-name">___________________________</div>'
        }
      </div>
      <div class="sig-box">
        <div class="sig-title">Signature Client${iv.clientSignatureName ? ` — ${iv.clientSignatureName}` : ''}</div>
        ${
          iv.signatureClient
            ? `<img src="${iv.signatureClient}" class="sig-img" />`
            : '<div class="sig-line"></div><div class="sig-name">___________________________</div>'
        }
      </div>
    </div>
  `;
}

// ── HTML complet ──────────────────────────────────────────────────────────────

function buildHtml(iv: Intervention, docType: 'BON' | 'RAPPORT', techName?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8">${baseStyle()}</head>
    <body>
      ${header(iv, docType)}
      ${sectionTech(iv, techName)}
      ${sectionVehicule(iv)}
      ${sectionTravaux(iv)}
      ${docType === 'BON' ? sectionChecklistBon() : ''}
      ${docType === 'RAPPORT' ? sectionTechnique(iv) : ''}
      ${docType === 'RAPPORT' ? sectionCheckup(iv) : ''}
      ${docType === 'RAPPORT' && iv.notes ? `<h2>Rapport / Notes</h2><div class="notes-box">${iv.notes}</div>` : ''}
      ${sectionSignatures(iv, docType)}
      <div class="footer">TrackYu GPS · Document généré le ${fmtDate(new Date().toISOString())} · Réf ${iv.id}</div>
    </body>
    </html>
  `;
}

// ── API publique ──────────────────────────────────────────────────────────────

export async function downloadBonIntervention(iv: Intervention, techName?: string): Promise<void> {
  const html = buildHtml(iv, 'BON', techName);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Bon intervention ${iv.id}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
}

export async function downloadRapportIntervention(iv: Intervention, techName?: string): Promise<void> {
  const html = buildHtml(iv, 'RAPPORT', techName);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Rapport intervention ${iv.id}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
}
