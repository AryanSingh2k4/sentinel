-- Identity Domain
CREATE TABLE IF NOT EXISTS operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Target Domain
CREATE TABLE IF NOT EXISTS targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    base_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verification_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS target_scope (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES targets(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS target_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES targets(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    token TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Scan Domain
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES targets(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'queued',
    profile TEXT DEFAULT 'standard',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS scan_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS scan_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    urls_discovered INTEGER DEFAULT 0,
    findings_created INTEGER DEFAULT 0,
    evidence_created INTEGER DEFAULT 0,
    runtime_seconds INTEGER DEFAULT 0
);

-- Event Store Domain
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_scan ON events(scan_id);

-- Graph Memory Domain
CREATE TABLE IF NOT EXISTS graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL,
    label TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_scan ON graph_nodes(scan_id);

CREATE TABLE IF NOT EXISTS graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    source_node UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_node UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
    edge_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Recon Domain
CREATE TABLE IF NOT EXISTS discovered_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    status_code INTEGER,
    discovered_by TEXT
);

CREATE TABLE IF NOT EXISTS discovered_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    action TEXT,
    method TEXT,
    fields JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS discovered_technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    technology TEXT NOT NULL,
    version TEXT,
    confidence NUMERIC DEFAULT 1.0
);

-- Finding Domain
CREATE TABLE IF NOT EXISTS candidate_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence NUMERIC DEFAULT 0.0,
    reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_findings_scan ON candidate_findings(scan_id);

CREATE TABLE IF NOT EXISTS confirmed_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_finding_id UUID REFERENCES candidate_findings(id) ON DELETE CASCADE,
    evidence_id UUID,
    severity TEXT NOT NULL,
    confirmed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finding_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID REFERENCES confirmed_findings(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES operators(id) ON DELETE CASCADE,
    decision TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Evidence Domain
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID REFERENCES confirmed_findings(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL,
    storage_path TEXT,
    sha256_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_finding ON evidence(finding_id);

-- Alter confirmed_findings to add the fk (circular reference resolution)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_evidence') THEN
        ALTER TABLE confirmed_findings ADD CONSTRAINT fk_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS evidence_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Knowledge Engine Domain
CREATE TABLE IF NOT EXISTS cwes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    severity TEXT
);

CREATE TABLE IF NOT EXISTS cves (
    id TEXT PRIMARY KEY,
    cwe_id TEXT REFERENCES cwes(id),
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT
);

CREATE TABLE IF NOT EXISTS attack_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS remediation_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cwe_id TEXT REFERENCES cwes(id),
    remediation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scanner_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    detection_logic JSONB NOT NULL
);

-- Reporting Domain
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    pdf_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Domain
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cwes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cves ENABLE ROW LEVEL SECURITY;
ALTER TABLE attack_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanner_signatures ENABLE ROW LEVEL SECURITY;

-- Since this is an MVP single-operator setup, we allow the authenticated user to access their own data.
DROP POLICY IF EXISTS "Operators can view own record" ON operators;
CREATE POLICY "Operators can view own record" ON operators FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Operators can update own record" ON operators;
CREATE POLICY "Operators can update own record" ON operators FOR UPDATE USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Operators manage targets" ON targets;
CREATE POLICY "Operators manage targets" ON targets FOR ALL USING (
    operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Target Scope access" ON target_scope;
CREATE POLICY "Target Scope access" ON target_scope FOR ALL USING (
    target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Target Verification access" ON target_verification;
CREATE POLICY "Target Verification access" ON target_verification FOR ALL USING (
    target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Scans access" ON scans;
CREATE POLICY "Scans access" ON scans FOR ALL USING (
    target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Scan Steps access" ON scan_steps;
CREATE POLICY "Scan Steps access" ON scan_steps FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Scan Metrics access" ON scan_metrics;
CREATE POLICY "Scan Metrics access" ON scan_metrics FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Events access" ON events;
CREATE POLICY "Events access" ON events FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Graph Nodes access" ON graph_nodes;
CREATE POLICY "Graph Nodes access" ON graph_nodes FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Graph Edges access" ON graph_edges;
CREATE POLICY "Graph Edges access" ON graph_edges FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Urls access" ON discovered_urls;
CREATE POLICY "Urls access" ON discovered_urls FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Forms access" ON discovered_forms;
CREATE POLICY "Forms access" ON discovered_forms FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Tech access" ON discovered_technologies;
CREATE POLICY "Tech access" ON discovered_technologies FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Candidate Findings access" ON candidate_findings;
CREATE POLICY "Candidate Findings access" ON candidate_findings FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Confirmed Findings access" ON confirmed_findings;
CREATE POLICY "Confirmed Findings access" ON confirmed_findings FOR ALL USING (
    candidate_finding_id IN (SELECT id FROM candidate_findings WHERE scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid()))))
);

DROP POLICY IF EXISTS "Finding Reviews access" ON finding_reviews;
CREATE POLICY "Finding Reviews access" ON finding_reviews FOR ALL USING (
    reviewer_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Evidence access" ON evidence;
CREATE POLICY "Evidence access" ON evidence FOR ALL USING (
    finding_id IN (SELECT id FROM confirmed_findings WHERE candidate_finding_id IN (SELECT id FROM candidate_findings WHERE scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))))
);

DROP POLICY IF EXISTS "Evidence Metadata access" ON evidence_metadata;
CREATE POLICY "Evidence Metadata access" ON evidence_metadata FOR ALL USING (
    evidence_id IN (SELECT id FROM evidence WHERE finding_id IN (SELECT id FROM confirmed_findings WHERE candidate_finding_id IN (SELECT id FROM candidate_findings WHERE scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid()))))))
);

DROP POLICY IF EXISTS "Reports access" ON reports;
CREATE POLICY "Reports access" ON reports FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Report Exports access" ON report_exports;
CREATE POLICY "Report Exports access" ON report_exports FOR ALL USING (
    report_id IN (SELECT id FROM reports WHERE scan_id IN (SELECT id FROM scans WHERE target_id IN (SELECT id FROM targets WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid()))))
);

DROP POLICY IF EXISTS "Public read CWEs" ON cwes;
CREATE POLICY "Public read CWEs" ON cwes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read CVEs" ON cves;
CREATE POLICY "Public read CVEs" ON cves FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read attack patterns" ON attack_patterns;
CREATE POLICY "Public read attack patterns" ON attack_patterns FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read remediation guides" ON remediation_guides;
CREATE POLICY "Public read remediation guides" ON remediation_guides FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read scanner signatures" ON scanner_signatures;
CREATE POLICY "Public read scanner signatures" ON scanner_signatures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators read audit logs" ON audit_logs;
CREATE POLICY "Operators read audit logs" ON audit_logs FOR SELECT USING (
    auth.uid() IS NOT NULL
);
DROP POLICY IF EXISTS "Insert audit logs" ON audit_logs;
CREATE POLICY "Insert audit logs" ON audit_logs FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);
