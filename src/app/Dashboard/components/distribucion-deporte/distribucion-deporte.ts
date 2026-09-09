import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef, Input } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../Enviroments/Enviroment';

interface PieSlice {
  label: string;
  value: number;
  percent: number;
  color: string;
  // SVG arc
  path: string;
  // Label position
  labelX: number;
  labelY: number;
  lineX1: number;
  lineY1: number;
  lineX2: number;
  lineY2: number;
  lineX3: number;
}

@Component({
  selector: 'app-distribucion-deporte',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './distribucion-deporte.html',
  styleUrl: './distribucion-deporte.css',
})
export class DistribucionDeporte implements OnInit {

  slices: PieSlice[] = [];
  loading = true;

  private allVenuesData: any[] = [];
  private _filteredVenues: any[] | null = null;

  /** Palette matching the reference design */
  private readonly COLORS = [
    '#6366f1', // indigo
    '#22c55e', // green
    '#f97316', // orange
    '#06b6d4', // cyan
    '#a855f7', // purple
    '#ef4444', // red
    '#eab308', // yellow
    '#14b8a6', // teal
  ];

  @Input() set filteredVenues(list: any[] | null) {
    this._filteredVenues = list;
    this.buildSlices();
    this.cdr.detectChanges();
  }

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchVenues();
    }
  }

  fetchVenues() {
    this.loading = true;
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<any[]>(`${environment.apiUrl}/host-debts/venues/report`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        this.allVenuesData = data || [];
        this.loading = false;
        this.buildSlices();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching venues for pie chart:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  buildSlices() {
    const source = this._filteredVenues ?? this.allVenuesData;

    if (!source || source.length === 0) {
      this.slices = [];
      return;
    }

    // Group by venueName and sum totalIncome
    const groupMap = new Map<string, number>();
    source.forEach((v: any) => {
      const name: string = v.venueName || v.name || 'Sin nombre';
      const income: number = v.totalIncome || v.commissionAmount || 0;
      groupMap.set(name, (groupMap.get(name) ?? 0) + income);
    });

    // If all incomes are 0, distribute equally (just to show names)
    let entries = Array.from(groupMap.entries());
    const totalIncome = entries.reduce((s, [, v]) => s + v, 0);

    // Sort descending by value, cap at 8 slices, merge rest into "Otros"
    entries.sort((a, b) => b[1] - a[1]);
    let finalEntries = entries;
    if (entries.length > 8) {
      const main = entries.slice(0, 7);
      const otrosTotal = entries.slice(7).reduce((s, [, v]) => s + v, 0);
      main.push(['Otros', otrosTotal]);
      finalEntries = main;
    }

    const total = totalIncome > 0
      ? finalEntries.reduce((s, [, v]) => s + v, 0)
      : finalEntries.length; // equal if no income data

    // Build pie slices
    const cx = 110, cy = 110, r = 85, innerR = 0;
    let startAngle = -90; // start from top

    this.slices = finalEntries.map(([label, value], idx) => {
      const pct = total > 0 ? value / total : 1 / finalEntries.length;
      const angleDeg = pct * 360;
      const endAngle = startAngle + angleDeg;

      const midAngle = startAngle + angleDeg / 2;
      const path = this.describeArc(cx, cy, r, startAngle, endAngle, angleDeg < 360);

      // Label placement: outside the pie
      const labelR = r + 30;
      const lineR1 = r + 4;
      const lineR2 = r + 22;
      const mid = (midAngle * Math.PI) / 180;
      const lx = cx + labelR * Math.cos(mid);
      const ly = cy + labelR * Math.sin(mid);
      const lx1 = cx + lineR1 * Math.cos(mid);
      const ly1 = cy + lineR1 * Math.sin(mid);
      const lx2 = cx + lineR2 * Math.cos(mid);
      const ly2 = cy + lineR2 * Math.sin(mid);
      const lx3 = lx + (lx >= cx ? 12 : -12);

      startAngle = endAngle;

      return {
        label,
        value,
        percent: Math.round(pct * 1000) / 10,
        color: this.COLORS[idx % this.COLORS.length],
        path,
        labelX: lx3,
        labelY: ly,
        lineX1: lx1,
        lineY1: ly1,
        lineX2: lx2,
        lineY2: ly2,
        lineX3: lx3,
      } as PieSlice;
    });
  }

  /** SVG arc path between two angles */
  private describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number, closePath: boolean): string {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const sx = cx + r * Math.cos(toRad(startDeg));
    const sy = cy + r * Math.sin(toRad(startDeg));
    const ex = cx + r * Math.cos(toRad(endDeg));
    const ey = cy + r * Math.sin(toRad(endDeg));
    const sweep = endDeg - startDeg > 180 ? 1 : 0;
    if (!closePath) {
      // Full circle
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
    }
    return `M ${cx} ${cy} L ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${sweep} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`;
  }
}
