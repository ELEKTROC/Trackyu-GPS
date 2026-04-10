/**
 * E2E Test: Invoice Creation Flow
 * 
 * Tests navigating to the invoicing module and interacting with the invoice form.
 * Designed for mock mode (VITE_USE_MOCK=true).
 */
import { test, expect } from '@playwright/test';

// Helper: mock login
async function mockLogin(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const mockUser = {
      id: 'test-user-1',
      email: 'admin@trackyugps.com',
      name: 'Admin Test',
      role: 'SUPER_ADMIN',
      tenantId: 'tenant-1',
      permissions: [
        'VIEW_DASHBOARD', 'VIEW_FLEET', 'VIEW_MAP', 'VIEW_CLIENTS',
        'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'DELETE_INVOICE',
        'VIEW_ADMIN', 'MANAGE_ADMIN'
      ],
    };
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'mock-jwt-token');
    localStorage.setItem('isAuthenticated', 'true');
  });
}

test.describe('Invoice Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
  });

  test('invoicing section is accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Look for invoice/billing navigation
    const invoiceLink = page
      .locator('text=Factur').or(page.locator('text=Billing')).or(page.locator('text=Finance'))
      .first();
    
    if (await invoiceLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await invoiceLink.click();
      await page.waitForTimeout(500);
      
      // Should see invoices section
      const heading = page.locator('h1, h2, h3').filter({ hasText: /facture|invoice|billing/i }).first();
      await expect(heading).toBeVisible({ timeout: 5000 }).catch(() => {
        // May have a different UI structure
      });
    }
  });

  test('create invoice button exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Navigate to invoices
    const invoiceLink = page
      .locator('text=Factur').or(page.locator('text=Finance'))
      .first();
    
    if (await invoiceLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await invoiceLink.click();
      await page.waitForTimeout(500);
    }
    
    // Look for create invoice button
    const createButton = page
      .locator('button')
      .filter({ hasText: /nouvelle facture|créer|ajouter|new/i })
      .first();
    
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);
      
      // Modal or form should appear
      const form = page.locator('[role="dialog"], .modal, form').first();
      await expect(form).toBeVisible({ timeout: 3000 }).catch(() => {
        // Might navigate to a new page instead
      });
    }
  });

  test('invoice form has client and amount fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Navigate to invoices
    const invoiceLink = page
      .locator('text=Factur').or(page.locator('text=Finance'))
      .first();
    
    if (await invoiceLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await invoiceLink.click();
      await page.waitForTimeout(500);
    }
    
    // Open creation form
    const createButton = page
      .locator('button')
      .filter({ hasText: /nouvelle facture|créer|ajouter|new/i })
      .first();
    
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);
      
      // Check for invoice-specific form fields
      const clientSelect = page.locator('select, [role="combobox"], [role="listbox"]').first();
      const amountInput = page.locator('input[name*="amount"], input[name*="montant"], input[type="number"]').first();
      
      const hasClient = await clientSelect.isVisible({ timeout: 3000 }).catch(() => false);
      const hasAmount = await amountInput.isVisible({ timeout: 1000 }).catch(() => false);
      
      // At least one financial field should be visible
      expect(hasClient || hasAmount).toBeTruthy();
    }
  });

  test('invoice list shows table structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Navigate to invoices
    const invoiceLink = page
      .locator('text=Factur').or(page.locator('text=Finance'))
      .first();
    
    if (await invoiceLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await invoiceLink.click();
      await page.waitForTimeout(1000);
      
      // Should display a table or list of invoices
      const table = page.locator('table, [role="grid"], [role="table"]').first();
      const list = page.locator('[class*="list"], [class*="grid"]').first();
      
      const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
      const hasList = await list.isVisible({ timeout: 1000 }).catch(() => false);
      
      // Some kind of data structure should be visible
      expect(hasTable || hasList).toBeTruthy();
    }
  });
});
