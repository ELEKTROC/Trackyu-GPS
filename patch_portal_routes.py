# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
Patch script: create portalRoutes.js and mount it in v1Router.js
Run locally: python patch_portal_routes.py
"""
import subprocess
import sys
# Force UTF-8 stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')

PORTAL_ROUTES = r'''
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Portal Routes - CLIENT self-service endpoints
 * Accessible uniquement au role CLIENT (req.user.clientId doit etre defini)
 * Pas de permission speciale requise - isolation via clientId
 *
 * GET  /portal/dashboard       - stats agregees (factures, tickets, contrats, abonnements)
 * GET  /portal/invoices/:id    - detail d'une facture CLIENT
 * GET  /portal/contracts       - contrats du client
 * GET  /portal/subscriptions   - abonnements du client
 * GET  /portal/tickets/:id     - detail d'un ticket (avec verif ownership)
 */
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const contractRepository_1 = require("../repositories/contractRepository");
const ticketRepository_1 = require("../repositories/ticketRepository");

const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);

// Middleware: verifie que le user est un CLIENT avec un clientId resolu
function requireClientId(req, res, next) {
    if (!req.user || !req.user.clientId) {
        return res.status(403).json({ error: 'Acces reserve aux clients' });
    }
    return next();
}
router.use(requireClientId);

// GET /portal/dashboard
router.get('/dashboard', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId, clientId } = req.user;

        const [invResult, ticketResult, subResult] = yield Promise.all([
            // Factures non payees (SENT, OVERDUE, PARTIALLY_PAID)
            database_1.default.query(
                `SELECT COUNT(*) as count, COALESCE(SUM(i.amount_ttc - i.paid_amount), 0) as total_due
                 FROM invoices i
                 WHERE i.tenant_id = $1
                   AND i.tier_id = $2
                   AND i.status IN ('SENT','OVERDUE','PARTIALLY_PAID')
                   AND i.deleted_at IS NULL`,
                [tenantId, clientId]
            ),
            // Tickets ouverts (open)
            database_1.default.query(
                `SELECT COUNT(*) as count
                 FROM tickets t
                 WHERE t.tenant_id = $1
                   AND t.client_id = $2
                   AND t.status NOT IN ('RESOLVED','CLOSED')`,
                [tenantId, clientId]
            ),
            // Abonnements expirant dans 30 jours (expiring soon)
            database_1.default.query(
                `SELECT COUNT(*) as count
                 FROM subscriptions s
                 WHERE s.tenant_id = $1
                   AND s.client_id = $2
                   AND s.status = 'ACTIVE'
                   AND s.end_date IS NOT NULL
                   AND s.end_date <= NOW() + INTERVAL '30 days'`,
                [tenantId, clientId]
            ),
        ]);

        // Active contracts
        const contracts = yield contractRepository_1.contractRepository.findAll(tenantId, clientId);
        const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;

        // Derniere facture
        const lastInvResult = yield database_1.default.query(
            `SELECT id, invoice_number, date, due_date, status, amount_ht, amount_ttc, paid_amount
             FROM invoices
             WHERE tenant_id = $1 AND tier_id = $2 AND deleted_at IS NULL
             ORDER BY date DESC, created_at DESC
             LIMIT 1`,
            [tenantId, clientId]
        );

        res.json({
            contracts: { active: activeContracts },
            invoices: {
                unpaid: parseInt(invResult.rows[0].count, 10),
                totalDue: parseFloat(invResult.rows[0].total_due),
            },
            tickets: { open: parseInt(ticketResult.rows[0].count, 10) },
            subscriptionsExpiring: parseInt(subResult.rows[0].count, 10),
            latestInvoice: lastInvResult.rows[0] || null,
        });
    } catch (error) {
        logger_1.default.error('[Portal] dashboard error:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// GET /portal/invoices/:id
router.get('/invoices/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId, clientId } = req.user;
        const { id } = req.params;

        const invResult = yield database_1.default.query(
            `SELECT i.*, t.name as client_name
             FROM invoices i
             LEFT JOIN tiers t ON t.id = i.tier_id
             WHERE i.id = $1 AND i.tenant_id = $2 AND i.tier_id = $3 AND i.deleted_at IS NULL`,
            [id, tenantId, clientId]
        );
        if (!invResult.rows[0]) {
            return res.status(404).json({ error: 'Facture non trouvee' });
        }
        const invoice = invResult.rows[0];

        const itemsResult = yield database_1.default.query(
            `SELECT id, description, quantity, unit_price,
                    (quantity * unit_price) as total
             FROM invoice_items
             WHERE invoice_id = $1
             ORDER BY id`,
            [id]
        );

        res.json({ invoice, items: itemsResult.rows });
    } catch (error) {
        logger_1.default.error('[Portal] invoice detail error:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// GET /portal/contracts
router.get('/contracts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId, clientId } = req.user;
        const contracts = yield contractRepository_1.contractRepository.findAll(tenantId, clientId);
        res.json(contracts);
    } catch (error) {
        logger_1.default.error('[Portal] contracts error:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// GET /portal/subscriptions
router.get('/subscriptions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId, clientId } = req.user;

        const result = yield database_1.default.query(
            `SELECT
               s.*,
               v.plate  AS vehicle_plate,
               v.brand  AS vehicle_brand,
               v.model  AS vehicle_model,
               v.name   AS vehicle_name,
               c.contract_number
             FROM subscriptions s
             LEFT JOIN objects v   ON v.id = s.vehicle_id
             LEFT JOIN contracts c ON c.id::text = s.contract_id
             WHERE s.tenant_id = $1
               AND s.client_id = $2
             ORDER BY s.created_at DESC`,
            [tenantId, clientId]
        );
        res.json(result.rows);
    } catch (error) {
        logger_1.default.error('[Portal] subscriptions error:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// GET /portal/tickets/:id
router.get('/tickets/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: userId, email, tenantId } = req.user;
        const { id: ticketId } = req.params;

        const tierId = yield ticketRepository_1.resolveClientTierId(userId, email, tenantId);
        if (!tierId) {
            return res.status(403).json({ error: 'Aucun compte client lie' });
        }

        const ticket = yield ticketRepository_1.ticketRepository.checkClientOwnership(ticketId, tierId, tenantId);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket non trouve' });
        }

        const messagesResult = yield database_1.default.query(
            `SELECT id, ticket_id, text, sender, created_at
             FROM ticket_messages
             WHERE ticket_id = $1
             ORDER BY created_at ASC`,
            [ticketId]
        );

        res.json({ ticket, messages: messagesResult.rows });
    } catch (error) {
        logger_1.default.error('[Portal] ticket detail error:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

exports.default = router;
'''

REMOTE_PATH = "/var/www/trackyu-gps/backend/dist/routes/portalRoutes.js"

# Write the file to VPS
write_cmd = [
    "ssh", "trackyu-vps",
    f"python3 -c \"import sys; open('{REMOTE_PATH}', 'w').write(sys.stdin.read())\"",
]
result = subprocess.run(write_cmd, input=PORTAL_ROUTES, text=True, capture_output=True, encoding='utf-8')
if result.returncode != 0:
    print("ERROR writing portalRoutes.js:", result.stderr)
    exit(1)
print("✓ portalRoutes.js written")

# Verify the file was written
verify_cmd = ["ssh", "trackyu-vps", f"wc -l {REMOTE_PATH}"]
result = subprocess.run(verify_cmd, capture_output=True, text=True)
print("File size:", result.stdout.strip())

# Now patch v1Router.js to mount portal routes
V1_ROUTER_PATH = "/var/www/trackyu-gps/backend/dist/routes/v1Router.js"

# 1. Add import at top (after last import)
# 2. Mount the route

patch_cmd = [
    "ssh", "trackyu-vps",
    f"""python3 << 'PYEOF'
content = open('{V1_ROUTER_PATH}').read()

import_line = "const portalRoutes_1 = __importDefault(require('./portalRoutes'));"
mount_line = "v1Router.use('/portal', portalRoutes_1.default);"

# Check if already patched
if 'portalRoutes' in content:
    print('Already patched — skipping')
else:
    # Add import after last __importDefault line
    last_import_pos = content.rfind("const ")
    insert_pos = content.find("\\n", last_import_pos) + 1
    content = content[:insert_pos] + import_line + "\\n" + content[insert_pos:]

    # Add mount before exports.default
    content = content.replace(
        "exports.default = v1Router;",
        mount_line + "\\nexports.default = v1Router;"
    )

    open('{V1_ROUTER_PATH}', 'w').write(content)
    print('v1Router.js patched')
PYEOF"""
]
result = subprocess.run(patch_cmd, capture_output=True, text=True)
print(result.stdout.strip())
if result.stderr:
    print("STDERR:", result.stderr.strip())
if result.returncode != 0:
    print("ERROR patching v1Router.js")
    exit(1)

print("✓ Done. Restart backend to apply.")
