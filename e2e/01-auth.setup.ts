import { test as setup } from '@playwright/test';
import { USERNAME, PASSWORD, HOST } from './test-config';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ request }) => {
  // Send authentication request. Replace with your own.
  await request.post(`http://${HOST}/ghost/api/admin/session`, {
    data: {
      'username': USERNAME,
      'password': PASSWORD
    }
  });
  await request.storageState({ path: authFile });
  
});
