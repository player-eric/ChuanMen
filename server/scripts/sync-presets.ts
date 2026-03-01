/**
 * Sync title rules and task presets to a target environment via API.
 * Safe to run on production — only upserts, never deletes existing data.
 *
 * Usage:
 *   npx tsx scripts/sync-presets.ts                  # → localhost:4000
 *   npx tsx scripts/sync-presets.ts https://chuanmener.club   # → production
 */

const baseUrl = process.argv[2] || 'http://localhost:4000';

const titleRules = [
  { emoji: '🎬', name: '选片大神', stampEmoji: '🎬', threshold: 3, description: '累积获得 3 次 🎬 邮票' },
  { emoji: '🍳', name: '掌勺大拿', stampEmoji: '🍳', threshold: 3, description: '累积获得 3 次 🍳 邮票' },
  { emoji: '🏠', name: '待客扛把子', stampEmoji: '🏠', threshold: 3, description: '累积获得 3 次 🏠 邮票' },
  { emoji: '❤️', name: '暖心担当', stampEmoji: '❤️', threshold: 3, description: '累积获得 3 次 ❤️ 邮票' },
  { emoji: '💬', name: '气氛大师', stampEmoji: '💬', threshold: 3, description: '累积获得 3 次 💬 邮票' },
  { emoji: '📸', name: '镜头担当', stampEmoji: '📸', threshold: 3, description: '累积获得 3 次 📸 邮票' },
  { emoji: '🥾', name: '探路先锋', stampEmoji: '🥾', threshold: 3, description: '累积获得 3 次 🥾 邮票' },
  { emoji: '🎉', name: '搞事大王', stampEmoji: '🎉', threshold: 3, description: '累积获得 3 次 🎉 邮票' },
  { emoji: '☕', name: '咖啡大拿', stampEmoji: '☕', threshold: 3, description: '累积获得 3 次 ☕ 邮票' },
  { emoji: '🧹', name: '收纳大神', stampEmoji: '🧹', threshold: 3, description: '累积获得 3 次 🧹 邮票' },
  { emoji: '🎸', name: '才艺担当', stampEmoji: '🎸', threshold: 3, description: '累积获得 3 次 🎸 邮票' },
  { emoji: '🧁', name: '甜品大师', stampEmoji: '🧁', threshold: 3, description: '累积获得 3 次 🧁 邮票' },
];

const taskPresets = [
  { tag: '电影夜', roles: ['选片', '活动记录', '修图上传'] },
  { tag: '茶话会/分享会', roles: ['分享人', '活动记录', '修图上传'] },
  { tag: '徒步', roles: ['路线规划', '开车', '活动记录', '修图上传'] },
  { tag: '户外', roles: ['活动记录', '修图上传'] },
  { tag: '小聚', roles: ['活动记录', '修图上传'] },
  { tag: '其他', roles: ['活动记录', '修图上传'] },
];

async function post(path: string, body: object) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

async function put(path: string, body: object) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

async function get(path: string) {
  const res = await fetch(`${baseUrl}${path}`);
  return res.json();
}

async function main() {
  console.log(`\n🔄 Syncing to ${baseUrl}\n`);

  // ── Title Rules ──
  console.log('── Title Rules ──');
  const existing: any[] = await get('/api/title-rules');
  const existingNames = new Set(existing.map((r: any) => r.name));

  for (const tr of titleRules) {
    if (existingNames.has(tr.name)) {
      console.log(`  ⏭  ${tr.emoji} ${tr.name} (already exists)`);
      continue;
    }
    const res = await post('/api/title-rules', tr);
    if (res.ok) {
      console.log(`  ✅ ${tr.emoji} ${tr.name}`);
    } else {
      console.log(`  ❌ ${tr.emoji} ${tr.name} — ${res.status} ${JSON.stringify(res.data)}`);
    }
  }

  // ── Task Presets ──
  console.log('\n── Task Presets ──');
  const existingPresets: any[] = await get('/api/task-presets');
  const existingTags = new Set(existingPresets.map((p: any) => p.tag));

  for (const tp of taskPresets) {
    if (existingTags.has(tp.tag)) {
      // Update roles if preset already exists
      const existing = existingPresets.find((p: any) => p.tag === tp.tag);
      if (existing && JSON.stringify(existing.roles) !== JSON.stringify(tp.roles)) {
        const res = await put(`/api/task-presets/${existing.id}`, { roles: tp.roles });
        console.log(res.ok ? `  🔄 ${tp.tag} (updated)` : `  ❌ ${tp.tag} — ${res.status}`);
      } else {
        console.log(`  ⏭  ${tp.tag} (already exists)`);
      }
      continue;
    }
    const res = await post('/api/task-presets', tp);
    if (res.ok) {
      console.log(`  ✅ ${tp.tag}: ${tp.roles.join(', ')}`);
    } else {
      console.log(`  ❌ ${tp.tag} — ${res.status} ${JSON.stringify(res.data)}`);
    }
  }

  console.log('\n✨ Done\n');
}

main().catch(console.error);
