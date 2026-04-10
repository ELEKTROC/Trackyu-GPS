// Test Zod validation for contract update
const { z } = require('zod');

const CONTRACT_STATUSES = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED'];

const contractSchema = z.object({
  client_id: z.string().optional().nullable(),
  tier_id: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(CONTRACT_STATUSES).optional().nullable(),
  monthly_fee: z.coerce.number().min(0).optional().default(0),
  vehicle_count: z.coerce.number().int().min(0).optional().default(0),
  billing_cycle: z.string().optional().nullable(),
  auto_renew: z.preprocess((v) => v === 'true' ? true : v === 'false' ? false : v, z.boolean().optional().nullable()),
  items: z.array(z.object({
    description: z.string().optional().default(''),
    quantity: z.coerce.number().optional().default(1),
    unit_price: z.coerce.number().optional().nullable(),
    price: z.coerce.number().optional().nullable(),
    catalogItemId: z.string().optional().nullable()
  })).optional().nullable(),
  pdf_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  vehicle_ids: z.array(z.string()).optional().nullable(),
  contract_number: z.string().optional().nullable(),
  next_billing_date: z.string().optional().nullable(),
}).passthrough();

// Simulate what the frontend sends for this contract
const payload = {
  tier_id: "CLI-SMT-00021",
  client_id: "CLI-SMT-00021",
  start_date: "2025-05-01",
  end_date: "2026-05-01",
  status: "EXPIRED",
  monthly_fee: 80000,
  vehicle_count: 0,
  billing_cycle: "yearly",
  auto_renew: false,
  items: [],
  pdf_url: null,
  notes: null,
  subject: "ETUDE MAITRE TOURE - 2 BALISES",
  vehicle_ids: []
};

console.log("=== Testing contractSchema.partial().safeParse ===");
const result = contractSchema.partial().safeParse(payload);
console.log("Success:", result.success);
if (!result.success) {
  console.log("Errors:", JSON.stringify(result.error.flatten(), null, 2));
} else {
  console.log("Data keys:", Object.keys(result.data));
}

// Also test with undefined vehicleIds (another common pattern)
console.log("\n=== Testing with vehicleIds undefined ===");
const payload2 = { ...payload, vehicle_ids: undefined };
const result2 = contractSchema.partial().safeParse(payload2);
console.log("Success:", result2.success);
if (!result2.success) {
  console.log("Errors:", JSON.stringify(result2.error.flatten(), null, 2));
}

// Test with empty string tier_id
console.log("\n=== Testing with empty string tier_id ===");
const payload3 = { ...payload, tier_id: "", client_id: "" };
const result3 = contractSchema.partial().safeParse(payload3);
console.log("Success:", result3.success);
if (!result3.success) {
  console.log("Errors:", JSON.stringify(result3.error.flatten(), null, 2));
}

// Test with auto_renew as string
console.log("\n=== Testing with auto_renew as string 'false' ===");
const payload4 = { ...payload, auto_renew: "false" };
const result4 = contractSchema.partial().safeParse(payload4);
console.log("Success:", result4.success);
if (!result4.success) {
  console.log("Errors:", JSON.stringify(result4.error.flatten(), null, 2));
}
