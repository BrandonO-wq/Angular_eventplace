import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../Enviroments/Enviroment';

interface HostDebt {
  id: string;
  cycleStart: string;
  totalIncome: number;
  commissionAmount: number;
  paidAmount: number;
  status: string;
}

interface MonthPoint {
  label: string;
  comisiones: number;
  pendientes: number;
  reservas: number;
}

@Component({
  selector: 'app-evolucion-comisiones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evolucion-comisiones.html',
  styleUrl: './evolucion-comisiones.css',
})
export class EvolucionComisiones implements OnInit {
  // SVG chart dimensions
  readonly svgWidth = 500;
  readonly svgHeight = 250;
  readonly padLeft = 65;
  readonly padRight = 20;
  readonly padTop = 20;
  readonly padBottom = 30;

  months: MonthPoint[] = [];
  maxValue = 100;
  yTicks: number[] = [];

  // SVG path strings
  areaPath = '';
  reservasPath = '';
  comisionesPath = '';
  pendientesPath = '';
  reservasDots: { cx: number; cy: number }[] = [];
  comisionesDots: { cx: number; cy: number }[] = [];
  pendientesDots: { cx: number; cy: number }[] = [];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchDebts();
    }
  }

  fetchDebts() {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<HostDebt[]>(`${environment.apiUrl}/host-debts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        this.processData(data);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching host-debts:', err)
    });
  }

  processData(data: HostDebt[]) {
    // Build the last 4 months scaffold (sorted oldest → newest)
    const last4Months = this.getLast4Months();

    // Pre-seed map with 4 months all at 0
    const map = new Map<string, MonthPoint>();
    last4Months.forEach(({ key, label }) => {
      map.set(key, { label, comisiones: 0, pendientes: 0, reservas: 0 });
    });

    // Only keep records from last 4 months
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);

    data.forEach(d => {
      const date = new Date(d.cycleStart);
      if (date < cutoff) return; // skip older months

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (map.has(key)) {
        const p = map.get(key)!;
        p.reservas    += d.totalIncome;
        p.comisiones  += d.paidAmount;
        p.pendientes  += (d.commissionAmount - d.paidAmount);
      }
    });

    // Keep insertion order (oldest → newest)
    this.months = Array.from(map.values());

    // Calculate max for Y axis
    const allValues = this.months.flatMap(m => [m.reservas, m.comisiones, m.pendientes]);
    const rawMax = Math.max(...allValues, 1);
    // Round up to a nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    this.maxValue = Math.ceil(rawMax / magnitude) * magnitude;

    // Y ticks: 8 steps
    this.yTicks = [];
    for (let i = 8; i >= 0; i--) {
      this.yTicks.push((this.maxValue / 8) * i);
    }

    this.buildPaths();
  }

  /** Returns the last 4 months as { key: 'YYYY-MM', label: 'abr. 25' } */
  getLast4Months(): { key: string; label: string }[] {
    const result: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('es-PE', { month: 'short', year: '2-digit' });
      result.push({ key, label });
    }
    return result;
  }

  buildPaths() {
    const n = this.months.length;
    if (n === 0) return;

    const chartW = this.svgWidth - this.padLeft - this.padRight;
    const chartH = this.svgHeight - this.padTop - this.padBottom;

    const xPos = (i: number) => this.padLeft + (i / Math.max(n - 1, 1)) * chartW;
    const yPos = (v: number) => this.padTop + chartH - (v / this.maxValue) * chartH;

    // Reservas (blue)
    const rPts = this.months.map((m, i) => ({ x: xPos(i), y: yPos(m.reservas) }));
    this.reservasPath = rPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    this.areaPath = this.reservasPath
      + ` L ${rPts[rPts.length - 1].x.toFixed(1)} ${(this.padTop + chartH).toFixed(1)}`
      + ` L ${rPts[0].x.toFixed(1)} ${(this.padTop + chartH).toFixed(1)} Z`;
    this.reservasDots = rPts.map(p => ({ cx: p.x, cy: p.y }));

    // Comisiones (green)
    const cPts = this.months.map((m, i) => ({ x: xPos(i), y: yPos(m.comisiones) }));
    this.comisionesPath = cPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    this.comisionesDots = cPts.map(p => ({ cx: p.x, cy: p.y }));

    // Pendientes (orange)
    const pPts = this.months.map((m, i) => ({ x: xPos(i), y: yPos(m.pendientes) }));
    this.pendientesPath = pPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    this.pendientesDots = pPts.map(p => ({ cx: p.x, cy: p.y }));
  }

  yLabel(v: number): string {
    return `S/ ${v.toFixed(2)}`;
  }

  yLabelX(v: number): number {
    const chartH = this.svgHeight - this.padTop - this.padBottom;
    return this.padTop + chartH - (v / this.maxValue) * chartH;
  }
}
