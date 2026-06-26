export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attack_patterns: {
        Row: {
          category: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string | null
          details: Json | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          actor: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      candidate_findings: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          reasoning: string | null
          scan_id: string | null
          severity: string
          title: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          scan_id?: string | null
          severity: string
          title: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          scan_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_findings_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmed_findings: {
        Row: {
          candidate_finding_id: string | null
          confirmed: boolean | null
          created_at: string | null
          evidence_id: string | null
          id: string
          severity: string
        }
        Insert: {
          candidate_finding_id?: string | null
          confirmed?: boolean | null
          created_at?: string | null
          evidence_id?: string | null
          id?: string
          severity: string
        }
        Update: {
          candidate_finding_id?: string | null
          confirmed?: boolean | null
          created_at?: string | null
          evidence_id?: string | null
          id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmed_findings_candidate_finding_id_fkey"
            columns: ["candidate_finding_id"]
            isOneToOne: false
            referencedRelation: "candidate_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_evidence"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      cves: {
        Row: {
          cwe_id: string | null
          description: string | null
          id: string
          severity: string | null
          title: string
        }
        Insert: {
          cwe_id?: string | null
          description?: string | null
          id: string
          severity?: string | null
          title: string
        }
        Update: {
          cwe_id?: string | null
          description?: string | null
          id?: string
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cves_cwe_id_fkey"
            columns: ["cwe_id"]
            isOneToOne: false
            referencedRelation: "cwes"
            referencedColumns: ["id"]
          },
        ]
      }
      cwes: {
        Row: {
          description: string | null
          id: string
          name: string
          severity: string | null
        }
        Insert: {
          description?: string | null
          id: string
          name: string
          severity?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          severity?: string | null
        }
        Relationships: []
      }
      discovered_forms: {
        Row: {
          action: string | null
          fields: Json | null
          id: string
          method: string | null
          scan_id: string | null
        }
        Insert: {
          action?: string | null
          fields?: Json | null
          id?: string
          method?: string | null
          scan_id?: string | null
        }
        Update: {
          action?: string | null
          fields?: Json | null
          id?: string
          method?: string | null
          scan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovered_forms_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_technologies: {
        Row: {
          confidence: number | null
          id: string
          scan_id: string | null
          technology: string
          version: string | null
        }
        Insert: {
          confidence?: number | null
          id?: string
          scan_id?: string | null
          technology: string
          version?: string | null
        }
        Update: {
          confidence?: number | null
          id?: string
          scan_id?: string | null
          technology?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovered_technologies_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_urls: {
        Row: {
          discovered_by: string | null
          id: string
          method: string | null
          scan_id: string | null
          status_code: number | null
          url: string
        }
        Insert: {
          discovered_by?: string | null
          id?: string
          method?: string | null
          scan_id?: string | null
          status_code?: number | null
          url: string
        }
        Update: {
          discovered_by?: string | null
          id?: string
          method?: string | null
          scan_id?: string | null
          status_code?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovered_urls_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          scan_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          scan_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          scan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          evidence_type: string
          finding_id: string | null
          id: string
          sha256_hash: string
          storage_path: string | null
        }
        Insert: {
          evidence_type: string
          finding_id?: string | null
          id?: string
          sha256_hash: string
          storage_path?: string | null
        }
        Update: {
          evidence_type?: string
          finding_id?: string | null
          id?: string
          sha256_hash?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "confirmed_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_metadata: {
        Row: {
          evidence_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          evidence_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          evidence_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_metadata_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_reviews: {
        Row: {
          created_at: string | null
          decision: string
          finding_id: string | null
          id: string
          notes: string | null
          reviewer_id: string | null
        }
        Insert: {
          created_at?: string | null
          decision: string
          finding_id?: string | null
          id?: string
          notes?: string | null
          reviewer_id?: string | null
        }
        Update: {
          created_at?: string | null
          decision?: string
          finding_id?: string | null
          id?: string
          notes?: string | null
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finding_reviews_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "confirmed_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      graph_edges: {
        Row: {
          edge_type: string
          id: string
          metadata: Json | null
          scan_id: string | null
          source_node: string | null
          target_node: string | null
        }
        Insert: {
          edge_type: string
          id?: string
          metadata?: Json | null
          scan_id?: string | null
          source_node?: string | null
          target_node?: string | null
        }
        Update: {
          edge_type?: string
          id?: string
          metadata?: Json | null
          scan_id?: string | null
          source_node?: string | null
          target_node?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "graph_edges_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graph_edges_source_node_fkey"
            columns: ["source_node"]
            isOneToOne: false
            referencedRelation: "graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graph_edges_target_node_fkey"
            columns: ["target_node"]
            isOneToOne: false
            referencedRelation: "graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      graph_nodes: {
        Row: {
          created_at: string | null
          id: string
          label: string
          metadata: Json | null
          node_type: string
          scan_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          metadata?: Json | null
          node_type: string
          scan_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          metadata?: Json | null
          node_type?: string
          scan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "graph_nodes_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          auth_user_id: string
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      remediation_guides: {
        Row: {
          cwe_id: string | null
          id: string
          remediation: string
        }
        Insert: {
          cwe_id?: string | null
          id?: string
          remediation: string
        }
        Update: {
          cwe_id?: string | null
          id?: string
          remediation?: string
        }
        Relationships: [
          {
            foreignKeyName: "remediation_guides_cwe_id_fkey"
            columns: ["cwe_id"]
            isOneToOne: false
            referencedRelation: "cwes"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports: {
        Row: {
          created_at: string | null
          export_type: string
          id: string
          report_id: string | null
        }
        Insert: {
          created_at?: string | null
          export_type: string
          id?: string
          report_id?: string | null
        }
        Update: {
          created_at?: string | null
          export_type?: string
          id?: string
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          pdf_path: string | null
          scan_id: string | null
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pdf_path?: string | null
          scan_id?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pdf_path?: string | null
          scan_id?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_metrics: {
        Row: {
          evidence_created: number | null
          findings_created: number | null
          id: string
          runtime_seconds: number | null
          scan_id: string | null
          urls_discovered: number | null
        }
        Insert: {
          evidence_created?: number | null
          findings_created?: number | null
          id?: string
          runtime_seconds?: number | null
          scan_id?: string | null
          urls_discovered?: number | null
        }
        Update: {
          evidence_created?: number | null
          findings_created?: number | null
          id?: string
          runtime_seconds?: number | null
          scan_id?: string | null
          urls_discovered?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_metrics_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_steps: {
        Row: {
          completed_at: string | null
          id: string
          scan_id: string | null
          started_at: string | null
          status: string | null
          step_name: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          scan_id?: string | null
          started_at?: string | null
          status?: string | null
          step_name: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          scan_id?: string | null
          started_at?: string | null
          status?: string | null
          step_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_steps_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scanner_signatures: {
        Row: {
          detection_logic: Json
          id: string
          name: string
        }
        Insert: {
          detection_logic: Json
          id?: string
          name: string
        }
        Update: {
          detection_logic?: Json
          id?: string
          name?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          completed_at: string | null
          id: string
          profile: string | null
          started_at: string | null
          status: string | null
          target_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          profile?: string | null
          started_at?: string | null
          status?: string | null
          target_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          profile?: string | null
          started_at?: string | null
          status?: string | null
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "targets"
            referencedColumns: ["id"]
          },
        ]
      }
      target_scope: {
        Row: {
          id: string
          scope_type: string
          target_id: string | null
          value: string
        }
        Insert: {
          id?: string
          scope_type: string
          target_id?: string | null
          value: string
        }
        Update: {
          id?: string
          scope_type?: string
          target_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_scope_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "targets"
            referencedColumns: ["id"]
          },
        ]
      }
      target_verification: {
        Row: {
          created_at: string | null
          id: string
          method: string
          target_id: string | null
          token: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          method: string
          target_id?: string | null
          token: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          method?: string
          target_id?: string | null
          token?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "target_verification_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "targets"
            referencedColumns: ["id"]
          },
        ]
      }
      targets: {
        Row: {
          base_url: string
          created_at: string | null
          domain: string
          id: string
          operator_id: string | null
          status: string | null
          verification_expires_at: string | null
          verified_at: string | null
        }
        Insert: {
          base_url: string
          created_at?: string | null
          domain: string
          id?: string
          operator_id?: string | null
          status?: string | null
          verification_expires_at?: string | null
          verified_at?: string | null
        }
        Update: {
          base_url?: string
          created_at?: string | null
          domain?: string
          id?: string
          operator_id?: string | null
          status?: string | null
          verification_expires_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "targets_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
