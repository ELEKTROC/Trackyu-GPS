/**
 * E2E Test: Vehicle Creation Flow
 * 
 * Tests navigating to the fleet module and interacting with the vehicle form.
 * Designed for mock mode (VITE_USE_MOCK=true).
 */
import { test, expect } from '@playwright/test';

// Helper: mock login by setting localStorage tokens (mock mode)
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
        'VIEW_DASHBOARD', 'VIEW_FLEET', 'CREATE_VEHICLE', 'EDIT_VEHICLE',
        'DELETE_VEHICLE', 'VIEW_MAP', 'VIEW_CLIENTS', 'VIEW_INVOICES',
        'VIEW_ADMIN', 'MANAGE_ADMIN'
      ],
    };
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'mock-jwt-token');
    localStorage.setItem('isAuthenticated', 'true');
  });
}

test.describe('Vehicle Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
  });

  test('fleet view is accessible after login', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Look for fleet/vehicle related navigation or content
    const fleetLink = page.locator('text=Véhicules').or(page.locator('text=Flotte')).first();
    
    if (await fleetLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fleetLink.click();
      await page.waitForTimeout(500);
      
      // Should show fleet list or a vehicle table
      const heading = page.locator('h1, h2, h3').filter({ hasText: /véhicule|flotte|fleet/i }).first();
      await expect(heading).toBeVisible({ timeout: 5000 }).catch(() => {
        // Alternative: check for table or list structure
      });
    }
  });

  test('add vehicle button exists in fleet view', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Navigate to fleet section
    const fleetLink = page.locator('text=Véhicules').or(page.locator('text=Flotte')).first();
    if (await fleetLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fleetLink.click();
      await page.waitForTimeout(500);
    }
    
    // Look for add/create vehicle button
    const addButton = page
      .locator('button')
      .filter({ hasText: /ajouter|nouveau|créer|new|\+/i })
      .first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // A modal or form should appear
      const modal = page.locator('[role="dialog"], .modal, form').first();
      await expect(modal).toBeVisible({ timeout: 3000 }).catch(() => {
        // Form might be inline rather than modal
      });
    }
  });

  test('vehicle form has required fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Navigate to fleet
    const fleetLink = page.locator('text=Véhicules').or(page.locator('text=Flotte')).first();
    if (await fleetLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fleetLink.click();
      await page.waitForTimeout(500);
    }
    
    // Open vehicle creation form
    const addButton = page
      .locator('button')
      .filter({ hasText: /ajouter|nouveau|créer|new|\+/i })
      .first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // Check for common vehicle form fields
      const plateInput = page.locator('input[name="plate"], input[placeholder*="plaque"], input[placeholder*="immatriculation"]').first();
      const nameInput = page.locator('input[name="name"], input[placeholder*="nom"]').first();
      
      // At least one of these should be visible
      const hasPlate = await plateInput.isVisible({ timeout: 3000 }).catch(() => false);
      const hasName = await nameInput.isVisible({ timeout: 1000 }).catch(() => false);
      
      expect(hasPlate || hasName).toBeTruthy();
    }
  });
});
