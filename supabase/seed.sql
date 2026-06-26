-- Seed Data for Knowledge Engine
INSERT INTO cwes (id, name, description, severity) VALUES
('CWE-89', 'Improper Neutralization of Special Elements used in an SQL Command', 'SQL Injection', 'CRITICAL'),
('CWE-79', 'Improper Neutralization of Input During Web Page Generation', 'Cross-site Scripting (XSS)', 'HIGH'),
('CWE-200', 'Exposure of Sensitive Information to an Unauthorized Actor', 'Information Disclosure', 'MEDIUM')
ON CONFLICT (id) DO NOTHING;

INSERT INTO remediation_guides (cwe_id, remediation) VALUES
('CWE-89', 'Use parameterized queries or prepared statements instead of string concatenation.'),
('CWE-79', 'Implement Context-Aware Auto-Escaping in templates and use strict Content Security Policy (CSP).')
ON CONFLICT DO NOTHING;

INSERT INTO attack_patterns (name, category, description) VALUES
('SQL Injection Probing', 'Injection', 'Sending common SQL meta-characters to identify vulnerable inputs.'),
('XSS Fuzzing', 'Cross-Site Scripting', 'Injecting polyglot XSS payloads to test rendering context.')
ON CONFLICT DO NOTHING;
