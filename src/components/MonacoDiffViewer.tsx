'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { Check, Copy, ExternalLink, GitBranch, GitPullRequest, ShieldCheck, Columns, AlignJustify } from 'lucide-react';

// Dynamic import for Monaco Diff Editor to avoid SSR hydration issues
const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] flex items-center justify-center bg-secondary/30 text-muted-foreground font-mono text-[13px] border border-border rounded-[8px]">
        Loading Monaco Diff Editor...
      </div>
    ),
  }
);

export interface PatchItem {
  findingId: string;
  title: string;
  fileLocation: string;
  astLineStart?: number;
  astLineEnd?: number;
  originalCode: string;
  patchedCode: string;
  unifiedDiff: string;
  explanation: string;
  sandboxPassed: boolean;
  sandboxDiagnostics?: string[];
  selfHealingRetries?: number;
  branchName?: string;
  prUrl?: string;
  prNumber?: number;
}

interface MonacoDiffViewerProps {
  patch: PatchItem;
}

export function MonacoDiffViewer({ patch }: MonacoDiffViewerProps) {
  const { resolvedTheme } = useTheme();
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [inlineView, setInlineView] = useState(false);

  const isDark = resolvedTheme === 'dark';

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(patch.unifiedDiff);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  // Determine file language for Monaco
  const getLanguage = (filePath: string) => {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
    if (filePath.endsWith('.py')) return 'python';
    if (filePath.endsWith('.json')) return 'json';
    if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) return 'yaml';
    return 'plaintext';
  };

  return (
    <div className="border border-border rounded-[8px] bg-card overflow-hidden my-4 shadow-none">
      {/* Top Header Bar */}
      <div className="p-4 bg-secondary/60 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[13px] font-medium text-foreground">
              {patch.fileLocation}
            </span>
            {patch.astLineStart && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                AST Scope: L{patch.astLineStart}–L{patch.astLineEnd}
              </span>
            )}
            {patch.sandboxPassed && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-3 w-3" />
                Sandbox: tsc --noEmit Passed
              </span>
            )}
            {patch.selfHealingRetries && patch.selfHealingRetries > 0 ? (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                Self-Healed: {patch.selfHealingRetries} retry
              </span>
            ) : null}
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {patch.explanation}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setInlineView(!inlineView)}
            title={inlineView ? 'Switch to side-by-side diff' : 'Switch to unified inline diff'}
            className="px-2.5 py-1 text-[12px] font-mono bg-card hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {inlineView ? <Columns className="h-3.5 w-3.5" /> : <AlignJustify className="h-3.5 w-3.5" />}
            <span>{inlineView ? 'Side-by-Side' : 'Inline'}</span>
          </button>

          <button
            onClick={handleCopyDiff}
            className="px-2.5 py-1 text-[12px] font-mono bg-card hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copiedDiff ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Diff</span>
              </>
            )}
          </button>

          {patch.prUrl && (
            <a
              href={patch.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-[12px] font-medium bg-primary hover:bg-primary-hover text-primary-foreground rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span>View Pull Request</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Branch & PR Metadata Strip */}
      {patch.branchName && (
        <div className="px-4 py-2 bg-secondary/30 border-b border-border text-[12px] font-mono text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            <span>Branch:</span>
            <span className="text-foreground font-medium">{patch.branchName}</span>
          </div>
          {patch.prNumber && (
            <span className="text-[11px] text-muted-foreground">PR #{patch.prNumber}</span>
          )}
        </div>
      )}

      {/* Monaco Diff Editor Surface */}
      <div className="h-[340px] w-full border-t border-border">
        <DiffEditor
          height="100%"
          language={getLanguage(patch.fileLocation)}
          original={patch.originalCode}
          modified={patch.patchedCode}
          theme={isDark ? 'vs-dark' : 'light'}
          options={{
            readOnly: true,
            renderSideBySide: !inlineView,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
}
