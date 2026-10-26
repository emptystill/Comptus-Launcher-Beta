// Mezclador de volumen de Windows (volumen general y de cada aplicación) para el overlay.
// Un PowerShell que se queda abierto habla con la API de audio de Windows (Core Audio) mediante C# y atiende órdenes por stdin:
//   list            -> MIX|[{"pid":-1,"name":"Volumen general","vol":40,"mute":false,"active":true},{"pid":123,"name":"chrome",...}]
//   set|<pid>|<0-100>, mute|<pid>  -> MIX|ok        (pid -1 = volumen general)
const { spawn } = require('child_process');

const CS = `
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDevEnumCom { }
[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int N1(); int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice dev); }
[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid iid, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o); }
[ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int N1(); int N2(); int N3(); int N4();
  int SetMasterVolumeLevelScalar(float level, ref Guid ctx);
  int N5();
  int GetMasterVolumeLevelScalar(out float level);
  int N6(); int N7(); int N8(); int N9();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid ctx);
  int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
}
[ComImport, Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionManager2 { int N1(); int N2(); int GetSessionEnumerator(out IAudioSessionEnumerator e); }
[ComImport, Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionEnumerator { int GetCount(out int n); int GetSession(int i, out IAudioSessionControl s); }
[ComImport, Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionControl {
  int GetState(out int state);
  int N1(); int N2(); int N3(); int N4(); int N5(); int N6(); int N7(); int N8();
}
[ComImport, Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionControl2 {
  int GetState(out int state);
  int N1(); int N2(); int N3(); int N4(); int N5(); int N6(); int N7(); int N8();
  int N9(); int N10();
  int GetProcessId(out uint pid);
  [PreserveSig] int IsSystemSoundsSession();
  int N11();
}
[ComImport, Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface ISimpleAudioVolume {
  int SetMasterVolume(float level, ref Guid ctx);
  int GetMasterVolume(out float level);
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid ctx);
  int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
}

public static class Mix {
  static Guid Z = Guid.Empty;
  static IMMDevice Dev() {
    IMMDeviceEnumerator e = (IMMDeviceEnumerator)(new MMDevEnumCom());
    IMMDevice d; Marshal.ThrowExceptionForHR(e.GetDefaultAudioEndpoint(0, 1, out d)); return d;
  }
  static IAudioEndpointVolume Ep() {
    Guid g = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A"); object o;
    Marshal.ThrowExceptionForHR(Dev().Activate(ref g, 23, IntPtr.Zero, out o)); return (IAudioEndpointVolume)o;
  }
  static List<IAudioSessionControl2> Sessions() {
    Guid g = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"); object o;
    Marshal.ThrowExceptionForHR(Dev().Activate(ref g, 23, IntPtr.Zero, out o));
    IAudioSessionManager2 m = (IAudioSessionManager2)o;
    IAudioSessionEnumerator en; Marshal.ThrowExceptionForHR(m.GetSessionEnumerator(out en));
    int n; en.GetCount(out n);
    List<IAudioSessionControl2> l = new List<IAudioSessionControl2>();
    for (int i = 0; i < n; i++) { IAudioSessionControl c; en.GetSession(i, out c); l.Add((IAudioSessionControl2)c); }
    return l;
  }
  static string Esc(string s) { return s.Replace("\\\\", "/").Replace("\\"", "'"); }
  static string Item(int pid, string name, float vol, bool mute, bool active) {
    return "{\\"pid\\":" + pid + ",\\"name\\":\\"" + Esc(name) + "\\",\\"vol\\":" + (int)Math.Round(vol * 100) + ",\\"mute\\":" + (mute ? "true" : "false") + ",\\"active\\":" + (active ? "true" : "false") + "}";
  }
  public static string List() {
    StringBuilder sb = new StringBuilder("[");
    IAudioEndpointVolume ep = Ep(); float mv; bool mm; ep.GetMasterVolumeLevelScalar(out mv); ep.GetMute(out mm);
    sb.Append(Item(-1, "Volumen general", mv, mm, true));
    Dictionary<uint, bool> seen = new Dictionary<uint, bool>();
    foreach (IAudioSessionControl2 c in Sessions()) {
      uint pid; c.GetProcessId(out pid);
      bool sys = c.IsSystemSoundsSession() == 0;
      if (seen.ContainsKey(pid) && !sys) continue;
      int st; c.GetState(out st); if (st == 2) continue;   // 2 = caducada
      seen[pid] = true;
      string name;
      if (sys || pid == 0) name = "Sonidos del sistema";
      else { try { name = Process.GetProcessById((int)pid).ProcessName; } catch (Exception) { name = "Proceso " + pid; } }
      ISimpleAudioVolume v = (ISimpleAudioVolume)c; float vol; bool mute; v.GetMasterVolume(out vol); v.GetMute(out mute);
      sb.Append(",").Append(Item((int)pid, name, vol, mute, st == 1));
    }
    return sb.Append("]").ToString();
  }
  public static void Set(int pid, double pct) {
    float f = (float)Math.Max(0, Math.Min(100, pct)) / 100f;
    if (pid == -1) { Ep().SetMasterVolumeLevelScalar(f, ref Z); return; }
    foreach (IAudioSessionControl2 c in Sessions()) { uint p; c.GetProcessId(out p); if ((int)p == pid) ((ISimpleAudioVolume)c).SetMasterVolume(f, ref Z); }
  }
  public static void Mute(int pid) {
    if (pid == -1) { IAudioEndpointVolume ep = Ep(); bool m; ep.GetMute(out m); ep.SetMute(!m, ref Z); return; }
    bool want = false, got = false;
    foreach (IAudioSessionControl2 c in Sessions()) {
      uint p; c.GetProcessId(out p); if ((int)p != pid) continue;
      ISimpleAudioVolume v = (ISimpleAudioVolume)c;
      if (!got) { bool cur; v.GetMute(out cur); want = !cur; got = true; }
      v.SetMute(want, ref Z);
    }
  }
}
`;

const PS = `$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$src = @'
${CS}
'@
try { Add-Type -TypeDefinition $src } catch { [Console]::Out.WriteLine('MIX|fatal|' + $_.Exception.Message); [Console]::Out.Flush(); exit 1 }
[Console]::Out.WriteLine('MIX|ready'); [Console]::Out.Flush()
while (($l = [Console]::In.ReadLine()) -ne $null) {
  try {
    $p = $l.Split('|')
    if ($p[0] -eq 'list') { [Console]::Out.WriteLine('MIX|' + [Mix]::List()) }
    elseif ($p[0] -eq 'set') { [Mix]::Set([int]$p[1], [double]::Parse($p[2], [Globalization.CultureInfo]::InvariantCulture)); [Console]::Out.WriteLine('MIX|ok') }
    elseif ($p[0] -eq 'mute') { [Mix]::Mute([int]$p[1]); [Console]::Out.WriteLine('MIX|ok') }
    else { [Console]::Out.WriteLine('MIX|err|orden desconocida') }
  } catch { [Console]::Out.WriteLine('MIX|err|' + $_.Exception.Message) }
  [Console]::Out.Flush()
}`;

// spawnFn y platform se pueden sustituir en las pruebas
function createMixer({ spawnFn = spawn, platform = process.platform, idleMs = 120000, startTimeoutMs = 15000 } = {}) {
  let child = null, buf = '', ready = null, queue = [], idleT = null, lastError = '';
  const reset = () => { clearTimeout(idleT); idleT = setTimeout(stop, idleMs); };
  function stop() {
    clearTimeout(idleT);
    const c = child; child = null; ready = null; buf = '';
    for (const q of queue.splice(0)) q.resolve({ ok: false, error: 'mezclador detenido' });
    try { c && c.kill(); } catch { /* ya cerrado */ }
  }
  function onLine(line) {
    if (!line.startsWith('MIX|')) return;
    const body = line.slice(4);
    if (body === 'ready') { if (ready) ready.resolve(true); return; }
    if (body.startsWith('fatal|')) { lastError = body.slice(6); if (ready) ready.resolve(false); return; }
    const q = queue.shift(); if (!q) return;
    if (body.startsWith('err|')) q.resolve({ ok: false, error: body.slice(4) });
    else if (body === 'ok') q.resolve({ ok: true });
    else { try { q.resolve({ ok: true, data: JSON.parse(body) }); } catch { q.resolve({ ok: false, error: 'respuesta no válida' }); } }
  }
  function start() {
    if (platform !== 'win32') return Promise.resolve(false);
    if (ready) return ready.promise;
    let resolve; const promise = new Promise((r) => { resolve = r; });
    ready = { promise, resolve };
    lastError = '';
    try {
      child = spawnFn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(PS, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
      child.stdout.on('data', (d) => { buf += d.toString('utf8'); let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); onLine(l); } });
      child.on('exit', () => { if (ready) ready.resolve(false); child = null; ready = null; for (const q of queue.splice(0)) q.resolve({ ok: false, error: lastError || 'el mezclador se cerró' }); });
      child.on('error', (e) => { lastError = e.message; if (ready) ready.resolve(false); });
      setTimeout(() => { if (ready && ready.resolve) ready.resolve(false); }, startTimeoutMs);
    } catch (e) { lastError = e.message; resolve(false); ready = null; child = null; }
    return promise;
  }
  async function send(line) {
    if (platform !== 'win32') return { ok: false, error: 'El mezclador solo funciona en Windows.' };
    const ok = await start();
    if (!ok || !child) return { ok: false, error: lastError ? 'No se pudo iniciar el mezclador: ' + lastError : 'No se pudo iniciar el mezclador de Windows.' };
    reset();
    return new Promise((resolve) => { queue.push({ resolve }); try { child.stdin.write(line + '\n'); } catch (e) { queue.pop(); resolve({ ok: false, error: e.message }); } });
  }
  return {
    list: () => send('list'),
    set: (pid, vol) => send(`set|${parseInt(pid, 10)}|${Math.max(0, Math.min(100, Number(vol) || 0))}`),
    mute: (pid) => send(`mute|${parseInt(pid, 10)}`),
    warm: () => { start(); },   // calentar al abrir el overlay: compilar el C# tarda un par de segundos
    stop,
    PS,
  };
}

module.exports = { createMixer, PS };
