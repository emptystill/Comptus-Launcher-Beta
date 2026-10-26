const q = new URLSearchParams(location.search);
const ok = (c) => /^#[0-9a-f]{3,8}$/i.test(c || '');
if (ok(q.get('a'))) document.documentElement.style.setProperty('--a', q.get('a'));
if (ok(q.get('b'))) document.documentElement.style.setProperty('--b', q.get('b'));
if (q.get('v')) document.getElementById('v').textContent = 'Versión ' + q.get('v').replace(/[^0-9.]/g, '');
