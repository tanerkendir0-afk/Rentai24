const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

interface MemoryUsageData {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rssMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
}

interface HealthResponse {
  status: string;
  uptime: number;
  memoryUsage: MemoryUsageData;
  activeConnections: number | null;
  timestamp: string;
}

interface RapidResult {
  index: number;
  status: number;
  ok: boolean;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}: ${detail}`);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/diagnostics/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/diagnostics/health`);
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

async function crashTests() {
  console.log("\n══════════════════════════════════════");
  console.log("  1. CRASH DAYNIKLILIK TESTLERİ");
  console.log("══════════════════════════════════════\n");

  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json !!!",
    });
    record("Geçersiz JSON body", res.status === 400, `Status: ${res.status}`);
  } catch (err: unknown) {
    record("Geçersiz JSON body", false, `Error: ${getErrorMessage(err)}`);
  }

  const alive1 = await healthCheck();
  record("Health check (geçersiz JSON sonrası)", alive1, alive1 ? "Sunucu ayakta" : "Sunucu çöktü!");

  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "test",
        agentType: "nonexistent-agent-xyz-999",
      }),
    });
    record("Var olmayan agentId", res.status >= 200 && res.status < 500, `Status: ${res.status}`);
  } catch (err: unknown) {
    record("Var olmayan agentId", false, `Error: ${getErrorMessage(err)}`);
  }

  const alive2 = await healthCheck();
  record("Health check (var olmayan agent sonrası)", alive2, alive2 ? "Sunucu ayakta" : "Sunucu çöktü!");

  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "",
        agentType: "content-writer",
      }),
    });
    record("Boş mesaj", res.status === 400, `Status: ${res.status}`);
  } catch (err: unknown) {
    record("Boş mesaj", false, `Error: ${getErrorMessage(err)}`);
  }

  try {
    const longMessage = "A".repeat(100_001);
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: longMessage,
        agentType: "content-writer",
      }),
    });
    record("Çok uzun mesaj (100K+)", res.status === 400, `Status: ${res.status}`);
  } catch (err: unknown) {
    record("Çok uzun mesaj (100K+)", false, `Error: ${getErrorMessage(err)}`);
  }

  try {
    const specialChars = '🚀💥\x00\x01\x02<script>alert("xss")</script>{{template}}\n\r\t';
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: specialChars,
        agentType: "content-writer",
      }),
    });
    record("Özel karakterler", res.status >= 200 && res.status < 500, `Status: ${res.status}`);
  } catch (err: unknown) {
    record("Özel karakterler", false, `Error: ${getErrorMessage(err)}`);
  }

  const alive3 = await healthCheck();
  record("Health check (mesaj testleri sonrası)", alive3, alive3 ? "Sunucu ayakta" : "Sunucu çöktü!");

  const protectedEndpoints = [
    { path: "/api/leads", method: "GET" },
    { path: "/api/conversations", method: "GET" },
    { path: "/api/auth/profile", method: "PATCH" },
  ];
  for (const ep of protectedEndpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers: ep.method !== "GET" ? { "Content-Type": "application/json" } : {},
        body: ep.method !== "GET" ? JSON.stringify({}) : undefined,
      });
      const isProtected = res.status === 401 || res.status === 403;
      record(`Auth kontrolü ${ep.method} ${ep.path}`, isProtected, `Status: ${res.status}`);
    } catch (err: unknown) {
      record(`Auth kontrolü ${ep.method} ${ep.path}`, false, `Error: ${getErrorMessage(err)}`);
    }
  }

  const alive4 = await healthCheck();
  record("Health check (auth testleri sonrası)", alive4, alive4 ? "Sunucu ayakta" : "Sunucu çöktü!");

  console.log("\n  Rapid-fire: 20 chat isteği eşzamanlı...");
  const rapidPromises = Array.from({ length: 20 }, (_, i) =>
    fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Rapid-fire test #${i + 1}`,
        agentType: "content-writer",
      }),
    })
      .then((r): RapidResult => ({ index: i, status: r.status, ok: r.status < 500 }))
      .catch((): RapidResult => ({ index: i, status: 0, ok: false }))
  );
  const rapidResults = await Promise.all(rapidPromises);
  const successCount = rapidResults.filter(r => r.ok).length;
  record("Rapid-fire (20 chat isteği)", successCount === 20, `${successCount}/20 başarılı`);

  const alive5 = await healthCheck();
  record("Health check (rapid-fire sonrası)", alive5, alive5 ? "Sunucu ayakta" : "Sunucu çöktü!");
}

async function portCheck() {
  console.log("\n══════════════════════════════════════");
  console.log("  2. PORT KONTROLÜ");
  console.log("══════════════════════════════════════\n");

  const expectedPort = process.env.PORT || "5000";
  const fsModule = await import("fs");
  let portDetected = false;
  let unexpectedPortsFound = false;
  let unexpectedPortList: number[] = [];

  try {
    const { execSync } = await import("child_process");

    const serverPidRaw = execSync(
      "pgrep -f 'server/index.ts' 2>/dev/null || echo ''",
      { encoding: "utf-8" }
    ).trim();

    const serverPids = serverPidRaw.split("\n").filter(p => p.length > 0);
    let serverPid = "";
    let maxSockets = 0;
    for (const pid of serverPids) {
      try {
        const cmdline = fsModule.readFileSync(`/proc/${pid}/cmdline`, "utf-8");
        if (!cmdline.includes("server/index.ts")) continue;
        let socketCount = 0;
        try {
          const fds = fsModule.readdirSync(`/proc/${pid}/fd`);
          for (const fd of fds) {
            try {
              const link = fsModule.readlinkSync(`/proc/${pid}/fd/${fd}`);
              if (link.startsWith("socket:")) socketCount++;
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
        if (socketCount > maxSockets) {
          maxSockets = socketCount;
          serverPid = pid;
        }
      } catch { /* skip */ }
    }

    if (serverPid) {
      console.log(`  Sunucu PID: ${serverPid}`);

      const fdDir = `/proc/${serverPid}/fd`;
      const socketInodes = new Set<string>();
      try {
        const fds = fsModule.readdirSync(fdDir);
        for (const fd of fds) {
          try {
            const link = fsModule.readlinkSync(`${fdDir}/${fd}`);
            const inodeMatch = link.match(/^socket:\[(\d+)\]$/);
            if (inodeMatch) {
              socketInodes.add(inodeMatch[1]);
            }
          } catch { /* skip unreadable fds */ }
        }
      } catch { /* skip fd reading */ }

      const tcpData = fsModule.readFileSync(`/proc/${serverPid}/net/tcp`, "utf-8");
      const listenLines = tcpData.split("\n").filter(l => {
        const parts = l.trim().split(/\s+/);
        return parts.length > 9 && parts[3] === "0A";
      });

      const hexExpected = parseInt(expectedPort).toString(16).toUpperCase().padStart(4, "0");
      const nodeListenPorts: number[] = [];

      for (const line of listenLines) {
        const parts = line.trim().split(/\s+/);
        const inode = parts[9];
        if (socketInodes.has(inode)) {
          const portHex = parts[1].split(":")[1];
          const portNum = parseInt(portHex, 16);
          nodeListenPorts.push(portNum);
        }
      }

      console.log(`  Node.js sunucu dinleme portları: ${nodeListenPorts.length > 0 ? nodeListenPorts.join(", ") : "(bulunamadı)"}`);

      portDetected = nodeListenPorts.includes(parseInt(expectedPort));
      unexpectedPortList = nodeListenPorts.filter(p => p !== parseInt(expectedPort));
      unexpectedPortsFound = unexpectedPortList.length > 0;

      if (unexpectedPortsFound) {
        console.log(`  ⚠️ Beklenmeyen Node.js dinleme portları: ${unexpectedPortList.join(", ")}`);
      }
    } else {
      console.log("  ⚠️ Sunucu PID bulunamadı — port doğrulama yapılamadı");
    }
  } catch (err: unknown) {
    console.log(`  ⚠️ Process-level kontrol hatası: ${getErrorMessage(err)}`);
  }

  if (!portDetected) {
    const healthRes = await fetch(`${BASE_URL}/api/diagnostics/health`);
    if (healthRes.ok) {
      portDetected = true;
      console.log(`  HTTP doğrulama: Port ${expectedPort} yanıt veriyor (process-level doğrulama yapılamadı)`);
    }
  }

  record("Port 5000 dinleniyor", portDetected, portDetected ? `Port ${expectedPort} aktif` : `Port ${expectedPort} bulunamadı`);
  record("Beklenmeyen port yok", !unexpectedPortsFound, unexpectedPortsFound ? `Portlar ${unexpectedPortList.join(", ")} beklenmeyen şekilde yanıt veriyor` : "Sadece beklenen port dinleniyor");

  const agentTypes = ["content-writer", "social-media", "sales-sdr"];
  for (const agent of agentTypes) {
    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "test", agentType: agent }),
      });
      const reachable = res.status > 0;
      record(`Agent "${agent}" port ${expectedPort} üzerinden`, reachable, `Status: ${res.status}`);
    } catch (err: unknown) {
      record(`Agent "${agent}" port ${expectedPort} üzerinden`, false, `Error: ${getErrorMessage(err)}`);
    }
  }
}

async function memoryCheck() {
  console.log("\n══════════════════════════════════════");
  console.log("  3. BELLEK KONTROLÜ");
  console.log("══════════════════════════════════════\n");

  const beforeMem = await fetchHealth();
  if (!beforeMem) {
    record("Başlangıç bellek ölçümü", false, "Health endpoint erişilemedi");
    return;
  }

  console.log("  Başlangıç bellek durumu:");
  console.log(`    RSS:       ${beforeMem.memoryUsage.rssMB} MB`);
  console.log(`    HeapUsed:  ${beforeMem.memoryUsage.heapUsedMB} MB`);
  console.log(`    HeapTotal: ${beforeMem.memoryUsage.heapTotalMB} MB`);
  console.log(`    External:  ${beforeMem.memoryUsage.externalMB} MB`);
  console.log(`    Uptime:    ${beforeMem.uptime.toFixed(1)} saniye`);

  record("Başlangıç bellek ölçümü", true, `HeapUsed: ${beforeMem.memoryUsage.heapUsedMB} MB`);

  console.log("\n  50 ardışık chat isteği gönderiliyor...");
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Diagnostik test mesajı #${i + 1}`,
          agentType: "content-writer",
        }),
      });
    } catch { /* intentionally ignored — we only care about server stability */ }
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`  [${i + 1}/50] `);
      const midData = await fetchHealth();
      if (midData) {
        console.log(`HeapUsed: ${midData.memoryUsage.heapUsedMB} MB`);
      } else {
        console.log("(ölçüm alınamadı)");
      }
    }
  }

  const afterMem = await fetchHealth();
  if (!afterMem) {
    record("Son bellek ölçümü", false, "Health endpoint erişilemedi");
    return;
  }

  console.log("\n  Son bellek durumu:");
  console.log(`    RSS:       ${afterMem.memoryUsage.rssMB} MB`);
  console.log(`    HeapUsed:  ${afterMem.memoryUsage.heapUsedMB} MB`);
  console.log(`    HeapTotal: ${afterMem.memoryUsage.heapTotalMB} MB`);
  console.log(`    External:  ${afterMem.memoryUsage.externalMB} MB`);

  const heapGrowth = ((afterMem.memoryUsage.heapUsed - beforeMem.memoryUsage.heapUsed) / beforeMem.memoryUsage.heapUsed) * 100;
  const rssGrowth = ((afterMem.memoryUsage.rss - beforeMem.memoryUsage.rss) / beforeMem.memoryUsage.rss) * 100;

  console.log(`\n  Heap büyümesi: ${heapGrowth.toFixed(1)}%`);
  console.log(`  RSS büyümesi:  ${rssGrowth.toFixed(1)}%`);

  if (heapGrowth > 50) {
    record("Bellek sızıntısı kontrolü", false, `⚠️ UYARI: Heap %${heapGrowth.toFixed(1)} büyüdü (>50% eşik)`);
  } else {
    record("Bellek sızıntısı kontrolü", true, `Heap büyümesi %${heapGrowth.toFixed(1)} (<%50 eşik)`);
  }

  record("Son bellek ölçümü", true, `HeapUsed: ${afterMem.memoryUsage.heapUsedMB} MB`);
}

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║  FINN DIAGNOSTIK TEST RAPORU         ║");
  console.log("║  Stabilite & Sağlık Kontrolleri      ║");
  console.log("╚══════════════════════════════════════╝");

  const serverAlive = await healthCheck();
  if (!serverAlive) {
    console.error("\n❌ Sunucu erişilemez! Lütfen önce sunucuyu başlatın.");
    process.exit(1);
  }

  await crashTests();
  await portCheck();
  await memoryCheck();

  console.log("\n══════════════════════════════════════");
  console.log("  SONUÇ ÖZETİ");
  console.log("══════════════════════════════════════\n");

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`  Toplam: ${total} test`);
  console.log(`  ✅ Başarılı: ${passed}`);
  console.log(`  ❌ Başarısız: ${failed}`);
  console.log(`  Oran: %${((passed / total) * 100).toFixed(0)}\n`);

  if (failed > 0) {
    console.log("  Başarısız testler:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    ❌ ${r.name}: ${r.detail}`);
    });
  }

  console.log("\n══════════════════════════════════════\n");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error("Test script hatası:", err);
  process.exit(1);
});
