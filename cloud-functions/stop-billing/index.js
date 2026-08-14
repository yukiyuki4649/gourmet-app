// Cloud Run function (2nd-gen Cloud Functions) triggered by the budget's Pub/Sub
// notifications. When the actual cost reaches/exceeds the budget amount, it disables
// billing for this project — this stops all further charges, but it also breaks the
// site (Maps/Places/Firestore stop working) until billing is manually re-enabled in
// Cloud Console. That trade-off (guaranteed ¥0 over uptime) is intentional per the
// "run this for free" requirement.
import { cloudEvent } from '@google-cloud/functions-framework';
import { google } from 'googleapis';

cloudEvent('stopBilling', async cloudEvent => {
  const base64data = cloudEvent.data.message.data;
  const data = JSON.parse(Buffer.from(base64data, 'base64').toString());

  if (data.costAmount <= data.budgetAmount) {
    console.log(`No action necessary. (cost: ${data.costAmount}, budget: ${data.budgetAmount})`);
    return;
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/cloud-billing'],
  });
  const authClient = await auth.getClient();
  const projectId = await auth.getProjectId();
  google.options({ auth: authClient });

  const billing = google.cloudbilling('v1');
  const projectName = `projects/${projectId}`;

  const { data: billingInfo } = await billing.projects.getBillingInfo({ name: projectName });
  if (!billingInfo.billingEnabled) {
    console.log('Billing is already disabled.');
    return;
  }

  console.log(`Cost ${data.costAmount} exceeded budget ${data.budgetAmount} — disabling billing for ${projectId}`);
  await billing.projects.updateBillingInfo({
    name: projectName,
    requestBody: { billingAccountName: '' },
  });
  console.log('Billing disabled.');
});
