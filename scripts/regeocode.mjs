import 'dotenv/config';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/restaurants`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fromFirestoreFields(fields) {
  const out = {};
  for (const [key, val] of Object.entries(fields || {})) {
    if ('stringValue' in val) out[key] = val.stringValue;
    else if ('integerValue' in val) out[key] = Number(val.integerValue);
    else if ('doubleValue' in val) out[key] = val.doubleValue;
    else if ('booleanValue' in val) out[key] = val.booleanValue;
  }
  return out;
}

async function fetchAllRestaurants() {
  const docs = [];
  let pageToken;
  do {
    const url = new URL(baseUrl);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url);
    const data = await res.json();
    for (const d of data.documents || []) {
      const id = d.name.split('/').pop();
      docs.push({ id, ...fromFirestoreFields(d.fields) });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return docs;
}

async function geocode(name, area) {
  const query = `${name} ${area} 飲食店`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results?.length > 0) {
    const r = data.results[0];
    return { latitude: r.geometry.location.lat, longitude: r.geometry.location.lng, address: r.formatted_address, success: true };
  }
  return { success: false, status: data.status, error: data.error_message };
}

async function updateRestaurant(id, patch) {
  const fields = {};
  for (const [key, val] of Object.entries(patch)) {
    if (typeof val === 'number') fields[key] = { doubleValue: val };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else fields[key] = { stringValue: String(val) };
  }
  const mask = Object.keys(patch).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${baseUrl}/${id}?${mask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`update failed for ${id}: ${res.status} ${text}`);
  }
}

const all = await fetchAllRestaurants();
const targets = all.filter(r => !r.latitude || !r.longitude || (r.latitude === 0 && r.longitude === 0));

console.log(`total docs: ${all.length}`);
console.log(`need geocoding: ${targets.length}`);

let success = 0;
let failed = 0;
const failedList = [];

for (let i = 0; i < targets.length; i++) {
  const t = targets[i];
  process.stdout.write(`[${i + 1}/${targets.length}] ${t.name}... `);
  const result = await geocode(t.name, t.area || '');
  if (result.success) {
    await updateRestaurant(t.id, {
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.address,
      geocoded: true,
    });
    console.log('OK');
    success++;
  } else {
    console.log(`FAILED (${result.status})`);
    failedList.push(t.name);
    failed++;
  }
  await sleep(150);
}

console.log('\n========== 完了 ==========');
console.log(`成功: ${success}件`);
console.log(`失敗: ${failed}件`);
if (failedList.length > 0) {
  console.log('失敗した店舗:', failedList);
}
