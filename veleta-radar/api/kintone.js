// api/kintone.js — Vercel Serverless Function
//
// 【Vercel 環境変数設定】
//   KINTONE_SUBDOMAIN  = veleta
//   KINTONE_APP_ID     = 閉店情報DBのアプリID
//   KINTONE_API_TOKEN  = レコード追加権限付きトークン

const FIELD_MAP = {
  store_name: 'store_name',
  area:       'area',
  address:    'address',
  risk_score: 'risk_score',
  risk_tier:  'risk_tier',
  rating:     'google_rating',
  reviews:    'review_count',
  biz_status: 'biz_status',
  maps_url:   'maps_url',
  source:     'info_source',
  scan_date:  'scan_date',
};

function buildRecord(p) {
  const str = (v) => ({ value: v != null ? String(v) : '' });
  return {
    [FIELD_MAP.store_name]: str(p.name),
    [FIELD_MAP.area]:       str(p.area),
    [FIELD_MAP.address]:    str(p.vicinity),
    [FIELD_MAP.risk_score]: str(p.score),
    [FIELD_MAP.risk_tier]:  str(p.tierLabel),
    [FIELD_MAP.rating]:     str(p.rating ?? ''),
    [FIELD_MAP.reviews]:    str(p.reviews ?? ''),
    [FIELD_MAP.biz_status]: str(p.statusLabel),
    [FIELD_MAP.maps_url]:   str(p.mapsUrl),
    [FIELD_MAP.source]:     str('閉店予測レーダー'),
    [FIELD_MAP.scan_date]:  str(p.scanDate),
  };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const subdomain = process.env.KINTONE_SUBDOMAIN;
  const appId     = process.env.KINTONE_APP_ID;
  const token     = process.env.KINTONE_API_TOKEN;

  if (!subdomain || !appId || !token) {
    return res.status(500).json({ error: 'Vercel 環境変数が未設定です（KINTONE_SUBDOMAIN / KINTONE_APP_ID / KINTONE_API_TOKEN）' });
  }

  const { places } = req.body || {};
  if (!Array.isArray(places) || places.length === 0) {
    return res.status(400).json({ error: 'places が空です' });
  }

  const url = `https://${subdomain}.cybozu.com/k/v1/records.json`;
  let ktRes;
  try {
    ktRes = await fetch(url, {
      method:  'POST',
      headers: { 'X-Cybozu-API-Token': token, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ app: Number(appId), records: places.map(buildRecord) }),
    });
  } catch (e) {
    return res.status(502).json({ error: 'kintone への接続失敗: ' + e.message });
  }

  const ktBody = await ktRes.json();
  if (!ktRes.ok) {
    return res.status(ktRes.status).json({ error: ktBody.message || `kintone エラー HTTP ${ktRes.status}`, detail: ktBody });
  }

  return res.status(200).json({ success: true, ids: ktBody.ids, count: places.length });
}
