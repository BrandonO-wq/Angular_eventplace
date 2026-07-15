import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../Enviroments/Enviroment';

interface RegisteredHost {
  hostId: string;
  hostName: string;
  registrationDate: string;
  email: string;
  phone: string;
  venuesCount: number;
  totalIncomeLastPeriod: number;
  commissionLastPeriod: number;
  deadlineLastPeriod: string | null;
  statusLastPeriod: string | null; // 'PENDING' | 'PAID' | 'OVERDUE' | 'LEGACY_PENDING' | null
}

@Component({
  selector: 'app-comisiones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comisiones.component.html',
  styleUrls: ['./comisiones.component.css']
})
export class ComisionesComponent implements OnInit {
  hosts: RegisteredHost[] = [];
  loading = true;
  errorMessage = '';

  // KPI calculations
  pendientesMonto = 0;
  pendientesCanchas = 0;

  vencidasMonto = 0;
  vencidasCanchas = 0;

  cobradasMonto = 0;
  cobradasCanchas = 0;

  // Verification Dates
  todayStr = '';
  nextSundayStr = '';
  nextMondayStr = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.calculateDates();
    if (isPlatformBrowser(this.platformId)) {
      this.fetchHosts();
    } else {
      this.loading = false;
    }
  }

  fetchHosts(): void {
    this.loading = true;
    this.errorMessage = '';

    let token = '';
    try {
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('accessToken') || '';
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }

    this.http.get<any>(`${environment.apiUrl}/host-debts/registered-hosts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        try {
          if (data && Array.isArray(data)) {
            this.hosts = data;
          } else {
            console.warn('API returned non-array data for hosts:', data);
            this.hosts = [];
          }
          this.calculateCommissions();
        } catch (e) {
          console.error('Error calculating commissions:', e);
          this.errorMessage = 'Error al calcular el resumen de comisiones.';
        } finally {
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error fetching hosts for commissions:', err);
        this.errorMessage = 'No se pudieron cargar los datos de comisiones.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateCommissions(): void {
    this.pendientesMonto = 0;
    this.pendientesCanchas = 0;
    this.vencidasMonto = 0;
    this.vencidasCanchas = 0;
    this.cobradasMonto = 0;
    this.cobradasCanchas = 0;

    this.hosts.forEach((host) => {
      const status = host.statusLastPeriod;
      const commission = host.commissionLastPeriod || 0;
      const venues = host.venuesCount || 0;

      if (status === 'PENDING' || status === 'LEGACY_PENDING') {
        this.pendientesMonto += commission;
        this.pendientesCanchas += venues;
      } else if (status === 'OVERDUE') {
        this.vencidasMonto += commission;
        this.vencidasCanchas += venues;
      } else if (status === 'PAID') {
        this.cobradasMonto += commission;
        this.cobradasCanchas += venues;
      }
    });
  }

  calculateDates(): void {
    const now = new Date();
    
    // Format current date: "Hoy: [Día], [dd] [Mes] [yyyy]"
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const dayName = days[now.getDay()];
    const dayNum = String(now.getDate()).padStart(2, '0');
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    
    this.todayStr = `Hoy: ${dayName}, ${dayNum} ${monthName} ${year}`;
    
    // Next Sunday:
    const daysToSunday = (7 - now.getDay()) % 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (daysToSunday === 0 ? 7 : daysToSunday));
    
    // Next Monday is next Sunday + 1 day
    const nextMonday = new Date(nextSunday);
    nextMonday.setDate(nextSunday.getDate() + 1);
    
    this.nextSundayStr = this.formatDate(nextSunday);
    this.nextMondayStr = this.formatDate(nextMonday);
  }

  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
