/**
 * Full End-to-End A-to-Z Test Suite for Sentinel AI
 * Tests all pages, APIs, live scan flows, reports, diff viewers, and verifies NO "Unknown Target" or "Target Application" appears anywhere.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function runE2ETests() {
  console.log('===========================================================');
  console.log('🛡️ SENTINEL AI - COMPREHENSIVE END-TO-END VERIFICATION SUITE');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // TEST 1: Dashboard API
  console.log('\n--- Section 1: Dashboard API (/api/dashboard) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/dashboard`);
    assert(res.ok, 'Dashboard API returns 200 OK');
    const data = await res.json();
    assert(Array.isArray(data.scans), 'Dashboard returns scans array');
    assert(data.scans.length > 0, `Scans present (found ${data.scans.length})`);
    
    // Check for Unknown Target
    const unknownScans = data.scans.filter((s: any) => 
      !s.target || 
      s.target.toLowerCase().includes('unknown target') || 
      s.target.toLowerCase() === 'target' ||
      s.target.toLowerCase() === 'unknown'
    );
    assert(unknownScans.length === 0, 'No scans have "Unknown Target" in Dashboard API', 
      unknownScans.length > 0 ? JSON.stringify(unknownScans) : undefined);

    console.log(`   Sample Scans: ${data.scans.slice(0, 3).map((s: any) => `${s.target} (${s.status})`).join(' | ')}`);
  } catch (err: any) {
    assert(false, 'Dashboard API reachable', err.message);
  }

  // TEST 2: Reports List API
  console.log('\n--- Section 2: Reports List API (/api/reports) ---');
  let firstScanIdWithReport = '';
  try {
    const res = await fetch(`${BASE_URL}/api/reports`);
    assert(res.ok, 'Reports List API returns 200 OK');
    const data = await res.json();
    assert(Array.isArray(data.reports), 'Reports returns array');
    assert(data.reports.length > 0, `Reports present (found ${data.reports.length})`);

    const unknownReports = data.reports.filter((r: any) => {
      const t = r.target || r.scans?.target || r.scans?.targets?.domain;
      return !t || t.toLowerCase().includes('unknown target') || t.toLowerCase().includes('target application');
    });
    assert(unknownReports.length === 0, 'No reports have "Unknown Target" or "Target Application"',
      unknownReports.length > 0 ? JSON.stringify(unknownReports) : undefined);

    if (data.reports.length > 0) {
      firstScanIdWithReport = data.reports[0].scan_id;
      console.log(`   Sample Report: Target="${data.reports[0].target}" | ScanID=${firstScanIdWithReport}`);
    }
  } catch (err: any) {
    assert(false, 'Reports List API reachable', err.message);
  }

  // TEST 3: Report Detail API
  console.log('\n--- Section 3: Report Detail API (/api/reports/[scanId]) ---');
  if (firstScanIdWithReport) {
    try {
      const res = await fetch(`${BASE_URL}/api/reports/${firstScanIdWithReport}`);
      assert(res.ok, `Report Detail API returns 200 OK for scan ${firstScanIdWithReport}`);
      const data = await res.json();
      assert(Boolean(data.meta), 'Report payload contains meta object');
      assert(Boolean(data.meta.target), `Target is resolved: "${data.meta?.target}"`);
      assert(
        !data.meta.target.toLowerCase().includes('unknown target') &&
        !data.meta.target.toLowerCase().includes('target application'),
        'Report Detail does NOT display "Unknown Target" or "Target Application"'
      );
      assert(Boolean(data.summary), 'Report summary is present');
      assert(Array.isArray(data.verifiedFindings), `Verified findings array present (${data.verifiedFindings?.length || 0})`);
    } catch (err: any) {
      assert(false, 'Report Detail API reachable', err.message);
    }
  }

  // TEST 4: Active Scan Console API
  console.log('\n--- Section 4: Active Scan Console API (/api/scans/[scanId]) ---');
  if (firstScanIdWithReport) {
    try {
      const res = await fetch(`${BASE_URL}/api/scans/${firstScanIdWithReport}`);
      assert(res.ok, `Active Scan API returns 200 OK for scan ${firstScanIdWithReport}`);
      const data = await res.json();
      assert(Boolean(data.scan), 'Active scan data is present');
      assert(Boolean(data.scan.target), `Scan target is resolved: "${data.scan?.target}"`);
      assert(
        !data.scan.target.toLowerCase().includes('unknown target') &&
        !data.scan.target.toLowerCase().includes('target application'),
        'Scan Console does NOT display "Unknown Target"'
      );
      assert(Array.isArray(data.events), `Live events array present (${data.events?.length || 0} events)`);
      assert(Array.isArray(data.discovered_urls), 'Discovered URLs array present');
      assert(Array.isArray(data.discovered_technologies), 'Discovered Tech array present');
    } catch (err: any) {
      assert(false, 'Active Scan API reachable', err.message);
    }
  }

  // TEST 5: GitHub Secrets Scanner API
  console.log('\n--- Section 5: GitHub Secrets Scanner API (/api/secrets) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/secrets`);
    assert(res.ok, 'Secrets API returns 200 OK');
    const data = await res.json();
    assert(Boolean(data.metrics), 'Metrics object returned');
    assert(Array.isArray(data.secrets), `Secrets inventory array present (${data.secrets?.length || 0} items)`);
    assert(Array.isArray(data.scans), `Git scan history array present (${data.scans?.length || 0} scans)`);

    // Check inventory repo targets
    const unknownInventory = (data.secrets || []).filter((s: any) =>
      !s.repoTarget ||
      s.repoTarget.toLowerCase().includes('unknown target') ||
      s.repoTarget.toLowerCase() === 'repository'
    );
    assert(unknownInventory.length === 0, 'No secrets inventory items have "Unknown Target" or generic "Repository"');

    // Check scan history targets
    const unknownHistory = (data.scans || []).filter((s: any) =>
      !s.target ||
      s.target.toLowerCase().includes('unknown target') ||
      s.target.toLowerCase().includes('target application')
    );
    assert(unknownHistory.length === 0, 'No scan history items have "Unknown Target" in GitHub Scanner');

    if (data.scans && data.scans.length > 0) {
      console.log(`   Sample Git Scans: ${data.scans.slice(0, 3).map((s: any) => `${s.target} (${s.status})`).join(' | ')}`);
    }
  } catch (err: any) {
    assert(false, 'Secrets API reachable', err.message);
  }

  // TEST 6: Page HTML Renders (Verify UI pages render 200 and no "Unknown Target" in text)
  console.log('\n--- Section 6: Next.js Frontend Page Renders ---');
  const pages = [
    { url: '/', name: 'Dashboard Page' },
    { url: '/reports', name: 'Reports List Page' },
    { url: `/reports/${firstScanIdWithReport}`, name: 'Report Details Page' },
    { url: `/scans/${firstScanIdWithReport}`, name: 'Active Scan Console Page' },
    { url: '/github-scanner', name: 'GitHub Scanner Page' },
  ];

  for (const page of pages) {
    try {
      const res = await fetch(`${BASE_URL}${page.url}`);
      assert(res.ok, `${page.name} (${page.url}) returns 200 OK`);
      const html = await res.text();
      assert(html.length > 500, `${page.name} rendered valid HTML markup`);
      assert(
        !html.includes('Unknown Target') && !html.includes('Target Application'),
        `${page.name} does NOT contain "Unknown Target" or "Target Application" in SSR HTML`
      );
    } catch (err: any) {
      assert(false, `${page.name} (${page.url}) render`, err.message);
    }
  }

  // TEST 7: Scan Initiation Flow
  console.log('\n--- Section 7: Live Scan Initiation Flow (/api/scans POST) ---');
  try {
    const testTarget = 'https://github.com/octocat/Hello-World';
    const res = await fetch(`${BASE_URL}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: testTarget, targetType: 'git' }),
    });
    assert(res.ok, 'Scan initiation POST /api/scans returns 200/201');
    const data = await res.json();
    assert(Boolean(data.scanId), `Scan initiated with scanId: ${data.scanId}`);
    assert(data.target === testTarget, `Target confirmed in response: ${data.target}`);

    // Verify immediately in scan details API
    const scanDetailRes = await fetch(`${BASE_URL}/api/scans/${data.scanId}`);
    assert(scanDetailRes.ok, 'Initiated scan details immediately accessible');
    const detailData = await scanDetailRes.json();
      assert(
        detailData.scan.target === 'github.com/octocat/Hello-World' ||
        detailData.scan.target === testTarget,
        `Target properly resolved in console: "${detailData.scan?.target}"`
      );
    } catch (err: any) {
      assert(false, 'Scan initiation flow', err.message);
    }

  // TEST 8: Web Vulnerability Scan Initiation
  console.log('\n--- Section 8: Web Vulnerability Scan Initiation ---');
  let webScanId = '';
  try {
    const webTarget = 'http://testphp.vulnweb.com';
    const res = await fetch(`${BASE_URL}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: webTarget, targetType: 'web' }),
    });
    assert(res.ok, 'Web scan initiation POST /api/scans returns 200/201');
    const data = await res.json();
    webScanId = data.scanId;
    assert(Boolean(webScanId), `Web scan started with scanId: ${webScanId}`);
    assert(data.targetType === 'web', 'Correctly identified targetType as "web"');

    const detailRes = await fetch(`${BASE_URL}/api/scans/${webScanId}`);
    assert(detailRes.ok, 'Web scan details accessible');
    const detailData = await detailRes.json();
    assert(detailData.scan.target === 'http://testphp.vulnweb.com', `Web target cleanly resolved: "${detailData.scan?.target}"`);
    assert(detailData.scan.target_type === 'web', 'Target type in console is "web"');
  } catch (err: any) {
    assert(false, 'Web scan initiation flow', err.message);
  }

  // TEST 9: Scan Cancellation Flow
  console.log('\n--- Section 9: Live Scan Cancellation Flow ---');
  if (webScanId) {
    try {
      const cancelRes = await fetch(`${BASE_URL}/api/scans/${webScanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      assert(cancelRes.ok, `Scan cancellation returns 200 OK for ${webScanId}`);
      const cancelData = await cancelRes.json();
      assert(cancelData.scan?.status === 'CANCELLED', 'Scan status immediately updated to CANCELLED in database');

      // Verify in GET /api/scans/:scanId
      const verifyRes = await fetch(`${BASE_URL}/api/scans/${webScanId}`);
      const verifyData = await verifyRes.json();
      assert(verifyData.scan?.status === 'CANCELLED', 'Active Scan console reflects CANCELLED status');
      const hasCancelEvent = verifyData.events?.some((e: any) => e.event_type === 'SCAN_CANCELLED');
      assert(hasCancelEvent, 'SCAN_CANCELLED event recorded in event log stream');
    } catch (err: any) {
      assert(false, 'Scan cancellation flow', err.message);
    }
  }

  // TEST 10: PatchAgent & PR Pipeline Verification
  console.log('\n--- Section 10: PatchAgent & PR Pipeline Verification ---');
  try {
    const { PatchAgent } = await import('./src/lib/agents/patch');
    const patchAgent = new PatchAgent({
      scanId: 'e2e-patch-test',
      target: 'https://github.com/octocat/Hello-World',
    });

    const mockReasoning = 'File: src/auth/login.ts\nVulnerable SQL concatenation detected in user query.';
    const originalCode = (patchAgent as any).resolveOriginalCode('src/auth/login.ts', mockReasoning, 'SQL Injection');
    assert(typeof originalCode === 'string' && originalCode.length > 0, 'PatchAgent generates/reads source code for target file');

    const astContext = (patchAgent as any).analyzeAST(originalCode, 'src/auth/login.ts', mockReasoning);
    assert(astContext.lineStart >= 1, `AST analysis successfully extracted vulnerability lines: ${astContext.lineStart}-${astContext.lineEnd}`);

    const prResult = await (patchAgent as any).dispatchGitHubPR(
      'src/auth/login.ts',
      originalCode.replace('// Vulnerable', '// Remediated by Sentinel'),
      '--- original\n+++ patched',
      'SQL Injection Remediation',
      'Fixed vulnerable string interpolation using parameterized queries',
      'mock-finding-123'
    );
    assert(Boolean(prResult.branchName), `Remediation branch synthesized: ${prResult.branchName}`);
    assert(Boolean(prResult.prUrl), `GitHub Pull Request URL generated: ${prResult.prUrl}`);
    assert(prResult.prUrl.includes('github.com/octocat/Hello-World'), 'PR URL matches exact repository target');
  } catch (err: any) {
    assert(false, 'PatchAgent & PR Pipeline', err.message);
  }

  // TEST 11: Shorthand Repository Scan Flow (e.g. "octocat/Hello-World")
  console.log('\n--- Section 11: Shorthand Git Target ("octocat/Hello-World") ---');
  try {
    const res = await fetch(`${BASE_URL}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'octocat/Hello-World' }),
    });
    assert(res.ok, 'Shorthand repo scan POST /api/scans returns 200/201');
    const data = await res.json();
    assert(data.targetType === 'git', 'Auto-detected targetType as "git" for owner/repo shorthand');

    const detailRes = await fetch(`${BASE_URL}/api/scans/${data.scanId}`);
    assert(detailRes.ok, 'Shorthand scan detail endpoint accessible');
    const detailData = await detailRes.json();
    assert(detailData.scan.target === 'github.com/octocat/Hello-World', `Target resolved with host: "${detailData.scan?.target}"`);
    assert(detailData.scan.base_url === 'https://github.com/octocat/Hello-World', `Valid HTTP baseUrl generated: "${detailData.scan?.base_url}"`);
  } catch (err: any) {
    assert(false, 'Shorthand Git Target flow', err.message);
  }

  // TEST 12: SSH Git Target Resolution ("git@github.com:octocat/Hello-World.git")
  console.log('\n--- Section 12: SSH Git Target Resolution ---');
  try {
    const { resolveScanTarget, formatTargetDisplay } = await import('./src/lib/utils/target-resolver');
    const resolved = resolveScanTarget({ target: 'git@github.com:octocat/Hello-World.git' });
    assert(resolved.targetType === 'git', 'SSH git target identified as git type');
    assert(resolved.display === 'github.com/octocat/Hello-World', `Clean display without ssh/git@: "${resolved.display}"`);
    assert(resolved.shortDisplay === 'octocat/Hello-World', `Clean shortDisplay: "${resolved.shortDisplay}"`);
    assert(resolved.baseUrl === 'https://github.com/octocat/Hello-World', `Valid clickable HTTPS baseUrl: "${resolved.baseUrl}"`);
  } catch (err: any) {
    assert(false, 'SSH Git Target resolution', err.message);
  }

  // TEST 13: Complex Web Target with Port & Query Parameters
  console.log('\n--- Section 13: Complex Web Target with Port & Query Parameters ---');
  try {
    const { resolveScanTarget, formatTargetDisplay } = await import('./src/lib/utils/target-resolver');
    const complexTarget = 'http://sub.domain.co.uk:8080/path?param=1';
    const resolved = resolveScanTarget({ target: complexTarget });
    assert(resolved.targetType === 'web', 'Identified as web target');
    assert(resolved.baseUrl === complexTarget, 'Preserved full URL with port & parameters');
    const stripped = formatTargetDisplay(complexTarget, { stripScheme: true });
    assert(stripped === 'sub.domain.co.uk:8080/path?param=1', `Stripped scheme correctly: "${stripped}"`);
  } catch (err: any) {
    assert(false, 'Complex Web Target resolution', err.message);
  }

  // TEST 14: Report JSON Download Content-Disposition Sanitization
  console.log('\n--- Section 14: Report JSON Download Header Sanitization ---');
  if (firstScanIdWithReport) {
    try {
      const res = await fetch(`${BASE_URL}/api/reports/${firstScanIdWithReport}?download=json`);
      assert(res.ok, 'Report JSON download returns 200 OK');
      const disp = res.headers.get('content-disposition');
      assert(Boolean(disp), `Content-Disposition header present: "${disp}"`);
      assert(
        Boolean(disp && !disp.includes('/') && !disp.includes('\\') && !disp.includes(':')),
        'Filename contains no illegal slash or colon characters'
      );
      const json = await res.json();
      assert(Boolean(json.meta && json.summary), 'Valid report JSON payload downloaded');
    } catch (err: any) {
      assert(false, 'Report JSON download flow', err.message);
    }
  }

  // TEST 15: PatchAgent PR Generation for Shorthand & SSH Repositories
  console.log('\n--- Section 15: PatchAgent PR Generation for Shorthand & SSH Repositories ---');
  try {
    const { PatchAgent } = await import('./src/lib/agents/patch');
    
    // Test Shorthand target
    const shorthandAgent = new PatchAgent({
      scanId: 'e2e-shorthand-test',
      target: 'AryanSingh2k4/PhishAware',
    });
    const shorthandPr = await (shorthandAgent as any).dispatchGitHubPR(
      'src/index.ts',
      'const a = 1;',
      'diff',
      'Fix SQLi',
      'Remediated',
      'finding-short-1'
    );
    assert(
      shorthandPr.prUrl.includes('github.com/AryanSingh2k4/PhishAware'),
      `Shorthand repo PR URL correct: "${shorthandPr.prUrl}"`
    );
    assert(
      !shorthandPr.prUrl.includes('/owner/repository/'),
      'PR URL does NOT fall back to generic /owner/repository/'
    );

    // Test SSH target
    const sshAgent = new PatchAgent({
      scanId: 'e2e-ssh-test',
      target: 'git@github.com:octocat/Hello-World.git',
    });
    const sshPr = await (sshAgent as any).dispatchGitHubPR(
      'index.js',
      'console.log("fixed");',
      'diff',
      'Fix Secret',
      'Remediated',
      'finding-ssh-1'
    );
    assert(
      sshPr.prUrl.includes('github.com/octocat/Hello-World'),
      `SSH repo PR URL correct: "${sshPr.prUrl}"`
    );
    assert(
      !sshPr.prUrl.includes('/owner/repository/'),
      'SSH PR URL does NOT fall back to generic /owner/repository/'
    );
  } catch (err: any) {
    assert(false, 'PatchAgent Shorthand/SSH PR flow', err.message);
  }

  console.log('\n===========================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});

