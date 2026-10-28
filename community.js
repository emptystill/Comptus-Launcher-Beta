// «Comunidad»: lista propia de proyectos de GitHub (ports de PC, descompilaciones, herramientas) con aviso de versiones nuevas.
// Se lee el feed público de lanzamientos de cada repositorio (no gasta el límite de la API de GitHub). Funciones simples y probables.
const REPO_RE = /^[A-Za-z0-9_.-]{1,60}\/[A-Za-z0-9_.-]{1,100}$/;

// De «https://github.com/usuario/repo/…» o «usuario/repo» saca «usuario/repo» (o null)
function parseRepo(input) {
  let s = String(input || '').trim().replace(/^git@github\.com:/i, '').replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/^github\.com\//i, '');
  s = s.split(/[?#]/)[0].replace(/\.git$/i, '');
  const p = s.split('/').filter(Boolean);
  if (p.length < 2) return null;
  const repo = p[0] + '/' + p[1];
  return REPO_RE.test(repo) ? repo : null;
}
// Del feed de lanzamientos (releases.atom o tags.atom): el primero, o null si no hay
function parseAtom(xml) {
  const m = /<entry>([\s\S]*?)<\/entry>/.exec(String(xml || ''));
  if (!m) return null;
  const e = m[1];
  const href = (/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/.exec(e) || /<link[^>]*href="([^"]+)"/.exec(e) || [])[1] || '';
  let tag = ''; try { tag = decodeURIComponent((/\/releases\/tag\/(.+)$/.exec(href) || [])[1] || '').slice(0, 60); } catch { /* etiqueta rara */ }
  if (!tag) return null;
  const title = ((/<title>([\s\S]*?)<\/title>/.exec(e) || [])[1] || tag).replace(/<!\[CDATA\[|\]\]>/g, '').trim().slice(0, 100);
  return { tag, name: title, at: Date.parse((/<updated>([^<]+)<\/updated>/.exec(e) || [])[1]) || 0, url: /^https:\/\/github\.com\//.test(href) ? href : null };
}
// RSS o Atom: la primera entrada (título, enlace, fecha) o null si no hay
function parseFeed(xml) {
  const s = String(xml || '');
  const m = /<entry[\s>]([\s\S]*?)<\/entry>/.exec(s) || /<item[\s>]([\s\S]*?)<\/item>/.exec(s);
  if (!m) return null;
  const e = m[1], clean = (t) => String(t || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  const title = clean((/<title[^>]*>([\s\S]*?)<\/title>/.exec(e) || [])[1]).slice(0, 120);
  let link = (/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/.exec(e) || /<link[^>]*href="([^"]+)"/.exec(e) || [])[1] || clean((/<link[^>]*>([\s\S]*?)<\/link>/.exec(e) || [])[1]);
  link = /^https?:\/\//.test(link) ? link.replace(/&amp;/g, '&') : '';
  const date = Date.parse(clean((/<(?:updated|pubDate|published)[^>]*>([\s\S]*?)<\/(?:updated|pubDate|published)>/.exec(e) || [])[1])) || 0;
  const tag = (title || String(date || '')).slice(0, 120);
  if (!tag) return null;
  return { tag, name: title || tag, at: date, url: link || null };
}
// Qué es lo que pegó el usuario: GitHub, itch.io (devlog), GitLab, Codeberg/Gitea, SourceForge o la dirección de un feed RSS/Atom
function parseSource(input) {
  const s0 = String(input || '').trim();
  if (!s0) return null;
  const isGh = /^(https?:\/\/)?(www\.)?github\.com\//i.test(s0) || /^git@github\.com:/i.test(s0) || /^[A-Za-z0-9_-][A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]+$/.test(s0) && !/^[^/]*\.[a-z]{2,}\//i.test(s0);
  const gh = isGh ? parseRepo(s0) : null;
  if (gh) return { kind: 'github', id: gh.toLowerCase(), repo: gh, label: gh, page: `https://github.com/${gh}`, name: gh.split('/')[1].replace(/[-_]+/g, ' ').slice(0, 60) };
  let u; try { u = new URL(/^[a-z]+:\/\//i.test(s0) ? s0 : 'https://' + s0); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (!u.hostname.includes('.')) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, ''), parts = u.pathname.split('/').filter(Boolean);
  const nice = (t) => String(t).replace(/[-_]+/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase()).slice(0, 60);
  let m;
  if ((m = /^([a-z0-9-]+)\.itch\.io$/.exec(host)) && parts[0] && !['devlog', 'community'].includes(parts[0])) {
    const base = `https://${m[1]}.itch.io/${parts[0]}`;
    return { kind: 'itch', id: `itch:${m[1]}/${parts[0]}`.toLowerCase(), label: `itch.io · ${m[1]}`, page: base, feed: base + '/devlog.rss', name: nice(parts[0]) };
  }
  if (host === 'gitlab.com' && parts.length >= 2) {
    const path = parts.slice(0, parts.indexOf('-') > 0 ? parts.indexOf('-') : parts.length).join('/');
    return { kind: 'gitlab', id: `gitlab:${path}`.toLowerCase(), label: `GitLab · ${path}`, page: `https://gitlab.com/${path}`, feed: `https://gitlab.com/${path}/-/tags?format=atom`, name: nice(path.split('/').pop()) };
  }
  if (host === 'codeberg.org' && parts.length >= 2) {
    const path = parts[0] + '/' + parts[1];
    return { kind: 'gitea', id: `codeberg:${path}`.toLowerCase(), label: `Codeberg · ${path}`, page: `https://codeberg.org/${path}`, feed: `https://codeberg.org/${path}/releases.atom`, name: nice(parts[1]) };
  }
  if (host === 'sourceforge.net' && parts[0] === 'projects' && parts[1]) {
    return { kind: 'sourceforge', id: `sf:${parts[1]}`.toLowerCase(), label: `SourceForge · ${parts[1]}`, page: `https://sourceforge.net/projects/${parts[1]}/`, feed: `https://sourceforge.net/projects/${parts[1]}/rss?path=/`, name: nice(parts[1]) };
  }
  if (host.endsWith('moddb.com')) return { kind: 'moddb' };
  // cualquier otra dirección se trata como un feed RSS/Atom
  return { kind: 'feed', id: `feed:${host}${u.pathname}${u.search}`.toLowerCase().slice(0, 200), label: host, page: `${u.protocol}//${u.host}/`, feed: u.href, name: nice(parts[parts.length - 1] || host).replace(/\.(rss|xml|atom)$/i, '') };
}
// Proyectos cuya última versión es distinta de la que ya viste (solo si ya había una anotada)
function changed(items) { return items.filter((i) => i.release && i.seen && i.seen !== i.release.tag); }
module.exports = { parseRepo, parseSource, parseFeed, parseAtom, changed, REPO_RE };
