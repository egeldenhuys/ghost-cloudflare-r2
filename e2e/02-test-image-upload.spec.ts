import { test, expect } from '@playwright/test';
import { USERNAME, PASSWORD, SITE_NAME, HOST } from './test-config';
import path from 'path';

test('Create post and upload image', async ({ page }) => {
    await page.goto(`http://${HOST}/ghost/#/posts`);
    await expect(page.getByText('New post')).toBeVisible()
    await page.getByText('New post').click();
    await expect(page.getByPlaceholder('Post title')).toBeVisible()
    await page.getByPlaceholder('Post title').fill("Test: Create post and upload image");
    await page.getByRole('paragraph').click();
    await page.getByRole('paragraph').fill("Image 1:");
    await page.getByRole('paragraph').focus();
    await page.getByRole('paragraph').click();
    await page.keyboard.press('Enter');
    // await page.getByRole('paragraph').press('enter');

    await page.getByLabel('Add a card').click();
    // await expect(page.getByRole('menuitem', { name: 'Image /image' })).toBeVisible();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('menuitem').filter({ hasText: 'Image' }).click()
    const fileChooser = await fileChooserPromise;
    console.log(path.join(__dirname, 'images', 'random-x512.png').toString())
    await fileChooser.setFiles(path.join(__dirname, 'images', 'random-x512.png'));
    await page.getByTestId('image-card-populated').waitFor()
    await page.getByRole('link', { name: 'Posts' }).click()
});
