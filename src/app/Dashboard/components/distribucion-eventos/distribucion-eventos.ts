import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../Enviroments/Enviroment';

interface PieSlice {
  label: string;
  value: number;
  percent: number;
  color: string;
  path: string;
  labelX: number;
  labelY: number;
  lineX1: number;
  lineY1: number;
  lineX2: number;
  lineY2: number;
  lineX3: number;
}

@Component({
  selector: 'app-distribucion-eventos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './distribucion-eventos.html',
  styleUrl: './distribucion-eventos.css',
})
export class DistribucionEventos implements OnInit {

  slices: PieSlice[] = [];
  loading = true;
  errorMsg = '';

  /** Paleta de colores vibrantes para los tipos de evento */
  private readonly COLORS = [
    '#a855f7', // violeta – Bodas
    '#f97316', // naranja – Cumpleaños
    '#06b6d4', // cian    – Corporativo
    '#22c55e', // verde   – Social
    '#6366f1', // indigo
    '#ef4444', // rojo
    '#eab308', // amarillo
    '#14b8a6', // teal
  ];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchEventTypes();
    }
  }

  fetchEventTypes() {
    this.loading = true;
    this.errorMsg = '';
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<Record<string, number>>(
      `${environment.apiUrl}/bookings/admin/stats/event-types`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': '69420'
        }
      }
    ).subscribe({
      next: (data) => {
        this.buildSlices(data || {});
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching event-types stats:', err);
        this.errorMsg = 'No se pudieron cargar los datos.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  buildSlices(data: Record<string, number>) {
    const entries = Object.entries(data).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      this.slices = [];
      return;
    }

    // Ordenar de mayor a menor
    entries.sort((a, b) => b[1] - a[1]);

    const total = entries.reduce((s, [, v]) => s + v, 0);
    const cx = 110, cy = 110, r = 85;
    let startAngle = -90;

    this.slices = entries.map(([label, value], idx) => {
      const pct = value / total;
      const angleDeg = pct * 360;
      const endAngle = startAngle + angleDeg;
      const midAngle = startAngle + angleDeg / 2;

      const path = this.describeArc(cx, cy, r, startAngle, endAngle, angleDeg < 360);

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

  private describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number, closePath: boolean): string {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const sx = cx + r * Math.cos(toRad(startDeg));
    const sy = cy + r * Math.sin(toRad(startDeg));
    const ex = cx + r * Math.cos(toRad(endDeg));
    const ey = cy + r * Math.sin(toRad(endDeg));
    const sweep = endDeg - startDeg > 180 ? 1 : 0;
    if (!closePath) {
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
    }
    return `M ${cx} ${cy} L ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${sweep} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`;
  }
}
