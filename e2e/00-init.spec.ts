import { test, expect } from '@playwright/test';
import { USERNAME, PASSWORD, SITE_NAME, HOST } from './test-config';

test('Setup Blog', async ({ page }) => {

    while (true) {
        try {
            await page.waitForTimeout(1000);

            await page.goto(`http://${HOST}/ghost/#/setup`);
    
            while (! ((await page.getByRole('heading').textContent())?.includes("Welcome to Ghost."))) {
                const header = await page.getByRole('heading').textContent() || ""

                // I am not sure how to only make this test execute once, skip if Ghost is already configured.
                test.skip(header.includes(SITE_NAME), "Site has already been configured");
  
                await page.waitForTimeout(500);
                
                // goto does not seem to refresh if the URL is the same, use reload instead.
                await page.reload();
            }
            break;

        } catch (error) {
            console.log(error.name)
            console.log(error.message)
        if (error instanceof Error && error.name === 'Error' && error.message.includes('net::ERR_CONNECTION_REFUSED')) {
            console.log('Connection was refused: ' + error.message);
          } else {
            // Rethrow any other errors
            throw error;
          }
        }
    }
    
    await expect(page.getByRole('heading')).toContainText('Welcome to Ghost.');
    await page.getByPlaceholder('The Daily Awesome').click();
    await page.getByPlaceholder('The Daily Awesome').fill(SITE_NAME);
    await page.getByPlaceholder('Jamie Larson').click();
    await page.getByPlaceholder('Jamie Larson').fill('Admin');
    await page.getByPlaceholder('jamie@example.com').click();
    await page.getByPlaceholder('jamie@example.com').fill(USERNAME);
    await page.getByPlaceholder('At least 10 characters').click();
    await page.getByPlaceholder('At least 10 characters').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account & start' }).click();
    await page.waitForURL('**/ghost/#/dashboard');
    await expect(page.getByRole('heading')).toContainText('Let’s get started!');
});
