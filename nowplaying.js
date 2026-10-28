// «Sonando ahora»: lee y controla el reproductor activo de Windows (Spotify, YouTube Music, el navegador…) con los controles
// multimedia del sistema (SMTC). No usa cuentas ni claves. Un PowerShell que se queda abierto atiende órdenes por stdin:
//   get -> NP|{"has":true,"title":"…","artist":"…","playing":true,"key":"…","thumb":"data:…"|null,…}
//   toggle | next | prev -> NP|ok        (siempre responde una línea que empieza por NP|)
const { spawn } = require('child_process');

const PS = `$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
function Say($s) { [Console]::Out.WriteLine('NP|' + $s); [Console]::Out.Flush() }
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $bt = [string][char]96
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq ('IAsyncOperation' + $bt + '1') })[0]
  function Await($op, $type) { $t = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
  $null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]
  $null = [Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
  $null = [Windows.Storage.Streams.IInputStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
  $null = [Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
} catch { Say ('fatal|' + $_.Exception.Message); exit 1 }
function Em($e) { if ($e.Exception.InnerException) { return $e.Exception.InnerException.Message } return $e.Exception.Message }
$script:lastKey = ''
$script:tries = 0
function Get-State {
  $s = $mgr.GetCurrentSession()
  if ($null -eq $s) { return @{ has = $false } }
  $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $st = [string]$s.GetPlaybackInfo().PlaybackStatus
  $key = [string]$s.SourceAppUserModelId + '|' + [string]$props.Title + '|' + [string]$props.Artist
  $o = @{ has = $true; title = [string]$props.Title; artist = [string]$props.Artist; album = [string]$props.AlbumTitle; app = [string]$s.SourceAppUserModelId; playing = ($st -eq 'Playing'); status = $st; key = $key; thumb = $null }
  if ($key -ne $script:lastKey) {
    $script:tries++
    $err = ''
    try {
      if ($props.Thumbnail) {
        $strm = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        $bytes = $null
        try {
          $mi = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsStream' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IRandomAccessStream' } | Select-Object -First 1
          if ($null -eq $mi) { $mi = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IInputStream' } | Select-Object -First 1 }
          if ($null -eq $mi) { throw 'no hay método de lectura' }
          $net = $mi.Invoke($null, [object[]]@($strm))
          $ms = New-Object System.IO.MemoryStream
          $net.CopyTo($ms)
          $bytes = $ms.ToArray()
          $net.Dispose(); $ms.Dispose()
        } catch { $err = 'A: ' + (Em $_) }
        if ($null -ne $bytes -and $bytes.Length -gt 0 -and $bytes.Length -lt 3000000) {
          $ct = [string]$strm.ContentType; if ([string]::IsNullOrEmpty($ct)) { $ct = 'image/jpeg' }
          $o.thumb = 'data:' + $ct + ';base64,' + [Convert]::ToBase64String($bytes)
          $err = ''
        } elseif ($err -eq '') { $err = 'imagen vacía' }
      } else { $err = 'sin miniatura' }
    } catch { $err = 'T: ' + (Em $_) }
    $o.thumbErr = $err
    if ($null -ne $o.thumb -or $script:tries -ge 8) { $script:lastKey = $key; $script:tries = 0 }
  }
  return $o
}
Say 'ready'
while (($l = [Console]::In.ReadLine()) -ne $null) {
  try {
    $c = $l.Trim()
    if ($c -eq 'get') { Say ((Get-State) | ConvertTo-Json -Compress -Depth 3) }
    else {
      $s = $mgr.GetCurrentSession()
      if ($null -ne $s) {
        if ($c -eq 'toggle') { $null = Await ($s.TryTogglePlayPauseAsync()) ([bool]) }
        elseif ($c -eq 'next') { $null = Await ($s.TrySkipNextAsync()) ([bool]) }
        elseif ($c -eq 'prev') { $null = Await ($s.TrySkipPreviousAsync()) ([bool]) }
      }
      Say 'ok'
    }
  } catch { Say ('err|' + $_.Exception.Message) }
}`;

// spawnFn y platform se pueden sustituir en las pruebas
function createNowPlaying({ spawnFn = spawn, platform = process.platform, idleMs = 60000, startTimeoutMs = 15000 } = {}) {
  let child = null, buf = '', ready = null, queue = [], idleT = null, lastError = '';
  const reset = () => { clearTimeout(idleT); idleT = setTimeout(stop, idleMs); };
  function stop() {
    clearTimeout(idleT);
    const c = child; child = null; ready = null; buf = '';
    for (const q of queue.splice(0)) q.resolve({ ok: false, error: 'detenido' });
    try { c && c.kill(); } catch { /* ya cerrado */ }
  }
  function onLine(line) {
    if (!line.startsWith('NP|')) return;
    const body = line.slice(3);
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
      child.on('exit', () => { if (ready) ready.resolve(false); child = null; ready = null; for (const q of queue.splice(0)) q.resolve({ ok: false, error: lastError || 'se cerró' }); });
      child.on('error', (e) => { lastError = e.message; if (ready) ready.resolve(false); });
      setTimeout(() => { if (ready && ready.resolve) ready.resolve(false); }, startTimeoutMs);
    } catch (e) { lastError = e.message; resolve(false); ready = null; child = null; }
    return promise;
  }
  async function send(line) {
    if (platform !== 'win32') return { ok: false, error: 'Solo funciona en Windows.' };
    const ok = await start();
    if (!ok || !child) return { ok: false, error: lastError || 'No se pudo leer el reproductor de Windows.' };
    reset();
    return new Promise((resolve) => { queue.push({ resolve }); try { child.stdin.write(line + '\n'); } catch (e) { queue.pop(); resolve({ ok: false, error: e.message }); } });
  }
  return { get: () => send('get'), cmd: (c) => (['toggle', 'next', 'prev'].includes(c) ? send(c) : Promise.resolve({ ok: false, error: 'orden desconocida' })), stop, lastError: () => lastError, PS };
}

module.exports = { createNowPlaying, PS };
