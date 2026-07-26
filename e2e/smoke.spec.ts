import { expect, test } from '@playwright/test';

test.describe('EAB profile editor smoke', () => {
	test('loads example, shows keyids, opens section form and raw YAML', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText('EAB Profile Editor')).toBeVisible();

		await page.getByTestId('load-example').click();
		await expect(page.getByTestId('keyid-keyid_00')).toBeVisible();
		await expect(page.getByTestId('keyid-keyid_03')).toBeVisible();

		await page.getByTestId('keyid-keyid_00').click();
		await expect(page.getByRole('button', { name: 'CA handler' })).toBeVisible();

		await page.getByRole('button', { name: 'CA handler' }).click();
		await expect(page.locator('.field .name', { hasText: 'profile_id' })).toBeVisible();
		await expect(page.locator('.field .name', { hasText: 'allowed_domainlist' })).toBeVisible();

		await page.getByRole('link', { name: 'Templates' }).click();
		await expect(page.getByRole('heading', { name: 'Template source', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Apply template' })).toBeVisible();

		await page.getByRole('link', { name: 'Raw YAML' }).click();
		await expect(page.getByRole('heading', { name: 'Raw YAML', exact: true })).toBeVisible();
		await expect(page.getByTestId('yaml-editor')).toBeVisible();
		await expect(page.getByTestId('yaml-editor')).toContainText('keyid_00');
	});
});
