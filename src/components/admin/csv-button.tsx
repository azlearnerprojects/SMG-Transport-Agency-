'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Client-side CSV export. Escapes values and triggers a download. */
export function CsvButton({ filename, rows, label = 'Export CSV' }: { filename: string; rows: Record<string, unknown>[]; label?: string }) {
  function download() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]!);
    const escape = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={download} disabled={rows.length === 0}>
      <Download className="size-4" /> {label}
    </Button>
  );
}
