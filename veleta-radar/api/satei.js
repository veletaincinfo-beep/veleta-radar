// api/satei.js — Vercel Serverless Function
// 造作譲渡査定依頼 → kintone 査定依頼DBに登録
//
// 【Vercel 環境変数】
//   KINTONE_SUBDOMAIN   = veletainc
//   KINTONE_SATEI_APP   = 査定依頼DBのアプリID（新規作成後に設定）
//   KINTONE_SATEI_TOKEN = 査定依頼DB用APIトークン（レコード追加権限）

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const subdomain = process.env.KINTONE_SUBDOMAIN;
  const appId     = process.env.KINTONE_SATEI_APP;
  const token     = process.env.KINTONE_SATEI_TOKEN;

  if (!subdomain || !appId || !token) {
    return res.status(500).json({ error: '環境変数未設定' });
  }

  const p = req.body;
  if (!p) return res.status(400).json({ error: 'リクエストが空です' });

  const str = v => ({ value: v != null ? String(v) : '' });

  const record = {
    // 連絡先
    shopname:      str(p.shopname),
    contact_name:  str(p.name),
    tel:           str(p.tel),
    email:         str(p.email),
    // 物件情報
    address:       str(p.addr),
    tsubo:         str(p.tsubo),
    gyotai:        str(p.gyotai),
    rent:          str(p.rent),
    hosho:         str(p.hosho),
    syakku:        str(p.syakku),
    years:         str(p.years),
    equipment:     str(p.equipment),
    // 査定結果
    satei_center:  str(p.satei_center),
    satei_low:     str(p.satei_low),
    satei_high:    str(p.satei_high),
    hosho_return:  str(p.hosho_return),
    temochi:       str(p.temochi),
    inquiry_date:  str(p.inquiry_date),
    status:        str('新規'),
  };

  try {
    const ktRes = await fetch(`https://${subdomain}.cybozu.com/k/v1/records.json`, {
      method: 'POST',
      headers: { 'X-Cybozu-API-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: Number(appId), records: [record] }),
    });
    const body = await ktRes.json();
    if (!ktRes.ok) return res.status(ktRes.status).json({ error: body.message });
    return res.status(200).json({ success: true });
  } catch(e) {
    return res.status(502).json({ error: e.message });
  }
}
