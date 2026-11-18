const MAX_SCORE = 10000000;
const MAX_DISTANCE = 10000000;

function send(res, status, body) {
  res.status(status).json(body);
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

function normalizeName(value) {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,15}$/.test(name)) return null;
  return { name, key: name.toLowerCase() };
}

function asWholeNumber(value, maximum) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= maximum ? number : null;
}

async function callSupabase(settings, path, options = {}) {
  const response = await fetch(`${settings.url}${path}`, {
    ...options,
    headers: {
      apikey: settings.key,
      Authorization: `Bearer ${settings.key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Supabase request failed');
  return data;
}

async function getTopTen(settings) {
  return callSupabase(
    settings,
    '/rest/v1/leaderboard_scores?select=name,score,distance,updated_at&order=score.desc,distance.desc&limit=10'
  );
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const settings = config();
  if (!settings) {
    return send(res, 503, { message: 'Leaderboard is not configured yet.' });
  }

  try {
    if (req.method === 'GET') {
      return send(res, 200, { leaderboard: await getTopTen(settings) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return send(res, 405, { message: 'Method not allowed.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const player = normalizeName(body.name);
    const score = asWholeNumber(body.score, MAX_SCORE);
    const distance = asWholeNumber(body.distance, MAX_DISTANCE);
    if (!player || score === null || distance === null) {
      return send(res, 400, { message: 'Use a 2–16 character name and a valid score.' });
    }

    const savedResult = await callSupabase(settings, '/rest/v1/rpc/submit_leaderboard_score', {
      method: 'POST',
      body: JSON.stringify({
        p_name: player.name,
        p_name_key: player.key,
        p_score: score,
        p_distance: distance
      })
    });
    const saved = Array.isArray(savedResult)
      ? Boolean(savedResult[0]?.submit_leaderboard_score)
      : Boolean(savedResult);
    const leaderboard = await getTopTen(settings);
    const rank = leaderboard.findIndex((entry) => entry.name.toLowerCase() === player.key) + 1;

    return send(res, 200, { saved, rank: rank || null, leaderboard });
  } catch (error) {
    console.error('Leaderboard API error', error);
    return send(res, 502, { message: 'Leaderboard is temporarily unavailable.' });
  }
};
