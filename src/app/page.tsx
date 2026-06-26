import Link from 'next/link';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Search,
  Settings,
  User,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold tracking-tight text-foreground">Sentinel AI</span>
              </div>
              <div className="hidden md:flex space-x-6 text-sm font-medium text-muted-foreground">
                <Link href="#" className="text-foreground border-b-2 border-primary py-4">Dashboard</Link>
                <Link href="#" className="hover:text-foreground transition-colors py-4">Targets</Link>
                <Link href="#" className="hover:text-foreground transition-colors py-4">Scans</Link>
                <Link href="#" className="hover:text-foreground transition-colors py-4">Findings</Link>
                <Link href="#" className="hover:text-foreground transition-colors py-4">Reports</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-muted-foreground">
              <Search className="h-4 w-4 hover:text-foreground cursor-pointer transition-colors" />
              <Settings className="h-4 w-4 hover:text-foreground cursor-pointer transition-colors" />
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-border">
                <User className="h-4 w-4 text-foreground" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Security Overview</h1>
          <Button>New Scan</Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-none rounded-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Scans</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">12</div>
              <p className="text-xs text-muted-foreground mt-1">+2 from yesterday</p>
            </CardContent>
          </Card>
          <Card className="shadow-none rounded-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critical Findings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-destructive">4</div>
              <p className="text-xs text-muted-foreground mt-1">Requires immediate review</p>
            </CardContent>
          </Card>
          <Card className="shadow-none rounded-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">28</div>
              <p className="text-xs text-muted-foreground mt-1">Findings await validation</p>
            </CardContent>
          </Card>
          <Card className="shadow-none rounded-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">3</div>
              <p className="text-xs text-muted-foreground mt-1">Generated this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Tables Section */}
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* Active Scans */}
          <Card className="shadow-none rounded-md col-span-2 lg:col-span-1">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold">Active Scans</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[100px] text-xs">Scan ID</TableHead>
                    <TableHead className="text-xs">Target</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: "SCN-8421", target: "api.production.com", status: "Recon", progress: "45%" },
                    { id: "SCN-8422", target: "auth.staging.net", status: "Attack", progress: "82%" },
                    { id: "SCN-8423", target: "cdn.assets.io", status: "Queued", progress: "0%" },
                  ].map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{scan.id}</TableCell>
                      <TableCell className="text-sm font-medium">{scan.target}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px] uppercase rounded-sm px-1.5 py-0">
                          {scan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{scan.progress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Critical Findings */}
          <Card className="shadow-none rounded-md col-span-2 lg:col-span-1">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold">Critical Findings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[100px] text-xs">ID</TableHead>
                    <TableHead className="text-xs">Severity</TableHead>
                    <TableHead className="text-xs">Vulnerability</TableHead>
                    <TableHead className="text-xs text-right">Detected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: "FND-091", sev: "CRITICAL", type: "CWE-89: SQL Injection", time: "2h ago" },
                    { id: "FND-090", sev: "CRITICAL", type: "Exposed API Key", time: "5h ago" },
                    { id: "FND-088", sev: "HIGH", type: "CWE-79: Reflected XSS", time: "1d ago" },
                  ].map((finding) => (
                    <TableRow key={finding.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{finding.id}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold ${finding.sev === 'CRITICAL' ? 'text-destructive' : 'text-warning'}`}>
                          {finding.sev}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{finding.type}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{finding.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>

      </main>
    </div>
  );
}
