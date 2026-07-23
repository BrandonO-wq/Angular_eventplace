import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
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

interface VenueReportItem {
  venueId: string;
  venueName: string;
  ownerName: string;
  ownerEmail: string;
  delayDays: number;
  address: string;
  latitude: number;
  longitude: number;
  ubigeo: string;
  rating: number;
  debtStatus: string;
  commissionAmount: number;
  totalIncome: number;
  deadline: string | null;
  pasarelaFee?: number;
  netAmount?: number;
}

@Component({
  selector: 'app-comisiones',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  commissionPercentage = 4;

  // Report variables
  venueReports: VenueReportItem[] = [];
  filteredReports: VenueReportItem[] = [];
  searchQuery = '';
  activeFilter = 'Todos';
  expandedVenueId: string | null = null;

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
      this.fetchCommissionPercentage();
      this.fetchVenueReports();
    } else {
      this.loading = false;
    }
  }

  fetchCommissionPercentage(): void {
    let token = '';
    try {
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('accessToken') || '';
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }

    if (!token) return;

    this.http.get<any>(`${environment.apiUrl}/host-debts/commission/percentage`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (res) => {
        let val = typeof res === 'object' && res !== null ? (res.percentage ?? res.value ?? res.newValue) : res;
        let parsedVal = parseFloat(val);
        if (!isNaN(parsedVal)) {
          if (parsedVal > 0 && parsedVal <= 1) {
            this.commissionPercentage = parsedVal * 100;
          } else {
            this.commissionPercentage = parsedVal;
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error fetching commission percentage:', err);
      }
    });
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

  fetchVenueReports(): void {
    let token = '';
    try {
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('accessToken') || '';
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }

    if (!token) return;

    this.http.get<VenueReportItem[]>(`${environment.apiUrl}/host-debts/venues/report`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.venueReports = data.map(item => {
            const pasarelaFee = Number((item.commissionAmount * 0.02042).toFixed(2));
            const netAmount = Number((item.commissionAmount - pasarelaFee).toFixed(2));
            return {
              ...item,
              pasarelaFee: pasarelaFee,
              netAmount: netAmount
            };
          });
          this.applyFilters();
        }
      },
      error: (err) => {
        console.error('Error fetching venue reports:', err);
      }
    });
  }

  applyFilters(): void {
    let temp = this.venueReports;

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      temp = temp.filter(item => 
        (item.venueName && item.venueName.toLowerCase().includes(query)) || 
        (item.ownerName && item.ownerName.toLowerCase().includes(query)) || 
        (item.ownerEmail && item.ownerEmail.toLowerCase().includes(query))
      );
    }

    if (this.activeFilter !== 'Todos') {
      temp = temp.filter(item => {
        const status = item.debtStatus;
        if (this.activeFilter === 'Pendiente') {
          return status === 'PENDING' || status === 'LEGACY_PENDING';
        } else if (this.activeFilter === 'Pagado') {
          return status === 'PAID';
        } else if (this.activeFilter === 'Vencido') {
          return status === 'OVERDUE';
        }
        return true;
      });
    }

    this.filteredReports = temp;
    this.cdr.detectChanges();
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  toggleActionsMenu(venueId: string): void {
    if (this.expandedVenueId === venueId) {
      this.expandedVenueId = null;
    } else {
      this.expandedVenueId = venueId;
    }
  }

  toggleVenueStatus(report: VenueReportItem, enable: boolean): void {
    let token = '';
    try {
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('accessToken') || '';
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }

    if (!token) return;

    this.http.post<any>(`${environment.apiUrl}/host-debts/venue/${report.venueId}/toggle-status?active=${enable}`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (res) => {
        alert(res?.message || 'Estado de la cancha actualizado con éxito.');
        this.expandedVenueId = null;
        this.fetchVenueReports();
      },
      error: (err) => {
        console.error('Error toggling venue status:', err);
        alert(err?.error?.message || 'No se pudo actualizar el estado de la cancha.');
      }
    });
  }
}
