import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef, Input } from '@angular/core';
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
  venueId: string;
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
  readonly svgWidth = 520;
  readonly svgHeight = 260;
  readonly padLeft = 75;
  readonly padRight = 24;
  readonly padTop = 20;
  readonly padBottom = 36;

  months: MonthPoint[] = [];
  maxValue = 100;
  yTicks: number[] = [];

  // SVG path strings
  areaReservasPath = '';
  areaComisionesPath = '';
  areaPendientesPath = '';
  reservasPath = '';
  comisionesPath = '';
  pendientesPath = '';
  reservasDots: { cx: number; cy: number }[] = [];
  comisionesDots: { cx: number; cy: number }[] = [];
  pendientesDots: { cx: number; cy: number }[] = [];

  private allDebtsData: HostDebt[] = [];
  private _filteredVenues: any[] | null = null;

  @Input() set filteredVenues(list: any[] | null) {
    this._filteredVenues = list;
    this.applyFiltering();
  }

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
        this.allDebtsData = data;
        this.applyFiltering();
      },
      error: (err) => console.error('Error fetching host-debts:', err)
    });
  }

  applyFiltering() {
    let data = [...this.allDebtsData];
    if (this._filteredVenues) {
      const allowedVenueIds = new Set(this._filteredVenues.map(v => v.venueId));
      data = data.filter(d => allowedVenueIds.has(d.venueId));
    }
    this.processData(data);
    this.cdr.detectChanges();
  }

  processData(data: HostDebt[]) {
    const last4Months = this.getLast4Months();

    const map = new Map<string, MonthPoint>();
    last4Months.forEach(({ key, label }) => {
      map.set(key, { label, comisiones: 0, pendientes: 0, reservas: 0 });
    });

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);

    data.forEach(d => {
      const date = new Date(d.cycleStart);
      if (date < cutoff) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (map.has(key)) {
        const p = map.get(key)!;
        p.reservas    += d.totalIncome;
        p.comisiones  += d.paidAmount;
        p.pendientes  += Math.max(0, d.commissionAmount - d.paidAmount);
      }
    });

    this.months = Array.from(map.values());

    const allValues = this.months.flatMap(m => [m.reservas, m.comisiones, m.pendientes]);
    const rawMax = Math.max(...allValues, 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    this.maxValue = Math.ceil(rawMax / magnitude) * magnitude;

    this.yTicks = [];
    for (let i = 8; i >= 0; i--) {
      this.yTicks.push((this.maxValue / 8) * i);
    }

    this.buildPaths();
  }

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

  /** Generates a smooth cubic bezier path through a set of points */
  private smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cp1x = prev.x + (curr.x - prev.x) * 0.4;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * 0.4;
      const cp2y = curr.y;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }
    return d;
  }

  buildPaths() {
    const n = this.months.length;
    if (n === 0) return;

    const chartW = this.svgWidth - this.padLeft - this.padRight;
    const chartH = this.svgHeight - this.padTop - this.padBottom;
    const baseline = this.padTop + chartH;

    const xPos = (i: number) => this.padLeft + (i / Math.max(n - 1, 1)) * chartW;
    const yPos = (v: number) => this.padTop + chartH - (v / this.maxValue) * chartH;

    // Reservas (blue)
    const rPts = this.months.map((m, i) => ({ x: xPos(i), y: yPos(m.reservas) }));
    this.reservasPath = this.smoothPath(rPts);
    this.areaReservasPath = this.reservasPath
      + ` L ${rPts[rPts.length - 1].x.toFixed(1)} ${baseline.toFixed(1)}`
      + ` L ${rPts[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`;
    this.reservasDots = rPts.map(p => ({ cx: p.x, cy: p.y }));

    // Comisiones (green)
    const cPts = this.months.map((m, i) => ({ x: xPos(i), y: yPos(m.comisiones) }));
    this.comisionesPath = this.smoothPath(cPts);
    this.areaComisionesPath = this.comisionesPath
      + ` L ${cPts[cPts.length - 1].x.toFixed(1)} ${baseline.toFixed(1)}`
      + ` L ${cPts[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`;
    this.comisionesDots = cPts.map(p => ({ cx: p.x, cy: p.y }));

    // Pendientes (orange)
    const pPts = this.months.map((m, i) => ({ x: xPos(i), y: yPos(m.pendientes) }));
    this.pendientesPath = this.smoothPath(pPts);
    this.areaPendientesPath = this.pendientesPath
      + ` L ${pPts[pPts.length - 1].x.toFixed(1)} ${baseline.toFixed(1)}`
      + ` L ${pPts[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`;
    this.pendientesDots = pPts.map(p => ({ cx: p.x, cy: p.y }));
  }

  yLabel(v: number): string {
    if (v >= 1000) return `S/ ${(v / 1000).toFixed(1)}k`;
    return `S/ ${v.toFixed(0)}`;
  }

  yLabelX(v: number): number {
    const chartH = this.svgHeight - this.padTop - this.padBottom;
    return this.padTop + chartH - (v / this.maxValue) * chartH;
  }
}
