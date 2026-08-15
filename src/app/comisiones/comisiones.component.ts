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

interface VenueDisabledStatus {
  description: string;
  status: string;
  disabledReason: number;
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
  disabledStatus?: VenueDisabledStatus;
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

  // Modal variables for disabling venues
  showDisableModal = false;
  venueToDisable: VenueReportItem | null = null;
  notifyOwnerOnDisable = true;
  disablingVenueInProgress = false;

  // Owner details modal state
  showOwnerModal = false;
  selectedOwnerDetails: any = null;
  selectedOwnerVenues: any[] | null = null;
  loadingOwnerDetails = false;
  totalEarningsSum = 0;

  // Reminder modal state
  showReminderModal = false;
  sendingReminder = false;
  currentHostId: string | null = null;
  payments: any[] | null = null;

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
          this.venueReports.forEach(item => {
            this.fetchVenueDisabledStatus(item.venueId, token);
          });
          this.applyFilters();
        }
      },
      error: (err) => {
        console.error('Error fetching venue reports:', err);
      }
    });
  }

  fetchVenueDisabledStatus(venueId: string, token: string): void {
    this.http.get<VenueDisabledStatus>(`${environment.apiUrl}/host-debts/venue/${venueId}/disabled-status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (res) => {
        const report = this.venueReports.find(r => r.venueId === venueId);
        if (report) {
          report.disabledStatus = res;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error(`Error fetching disabled status for venue ${venueId}:`, err);
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
    if (!enable) {
      this.openDisableModal(report);
      return;
    }

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

  openDisableModal(report: VenueReportItem): void {
    this.venueToDisable = report;
    this.notifyOwnerOnDisable = true;
    this.showDisableModal = true;
  }

  closeDisableModal(): void {
    this.showDisableModal = false;
    this.venueToDisable = null;
  }

  confirmDisableVenue(): void {
    if (!this.venueToDisable) return;
    this.disablingVenueInProgress = true;

    let token = '';
    try {
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('accessToken') || '';
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }

    if (!token) {
      this.disablingVenueInProgress = false;
      return;
    }

    if (this.notifyOwnerOnDisable) {
      const host = this.hosts.find(h => h.email === this.venueToDisable?.ownerEmail);
      const userId = host ? host.hostId : null;

      if (userId) {
        const isAutomaticDebt = this.venueToDisable.debtStatus === 'OVERDUE' || 
                                this.venueToDisable.debtStatus === 'PENDING' || 
                                this.venueToDisable.debtStatus === 'LEGACY_PENDING';
        const title = '⚠️ Inhabilitación de Cancha';
        const body = isAutomaticDebt
          ? `Estimado propietario, le informamos que su salón "${this.venueToDisable.venueName}" va a ser inhabilitado por falta de pago.`
          : `Estimado propietario, le informamos que su salón "${this.venueToDisable.venueName}" va a ser inhabilitado. Para más detalles, por favor contáctese con el área de soporte.`;

        this.http.post<any>(
          `${environment.apiUrl}/api/v1/admin/users/${userId}/notify-debt`,
          { title, body },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'ngrok-skip-browser-warning': '69420'
            }
          }
        ).subscribe({
          next: () => {
            console.log('Notificación de inhabilitación enviada con éxito.');
            this.executeToggleVenueStatus(this.venueToDisable!, false, token);
          },
          error: (err) => {
            console.error('Error sending inhabilitación notification:', err);
            // Even if notification fails, we still proceed with disabling as requested
            this.executeToggleVenueStatus(this.venueToDisable!, false, token);
          }
        });
      } else {
        console.warn('No se encontró hostId correspondiente al email del propietario para notificar.');
        this.executeToggleVenueStatus(this.venueToDisable, false, token);
      }
    } else {
      this.executeToggleVenueStatus(this.venueToDisable, false, token);
    }
  }

  private executeToggleVenueStatus(report: VenueReportItem, enable: boolean, token: string): void {
    this.http.post<any>(`${environment.apiUrl}/host-debts/venue/${report.venueId}/toggle-status?active=${enable}`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (res) => {
        alert(res?.message || 'Estado de la cancha actualizado con éxito.');
        this.closeDisableModal();
        this.disablingVenueInProgress = false;
        this.expandedVenueId = null;
        this.fetchVenueReports();
      },
      error: (err) => {
        console.error('Error toggling venue status:', err);
        alert(err?.error?.message || 'No se pudo actualizar el estado de la cancha.');
        this.disablingVenueInProgress = false;
      }
    });
  }

  openOwnerModal(report: VenueReportItem): void {
    let hostId = (report as any).hostId || (report as any).ownerId;
    if (!hostId && (report.ownerEmail || report.ownerName)) {
      const found = this.hosts.find(
        h => (report.ownerEmail && h.email && h.email.toLowerCase() === report.ownerEmail.toLowerCase()) ||
             (report.ownerName && h.hostName && h.hostName.toLowerCase() === report.ownerName.toLowerCase())
      );
      if (found) {
        hostId = found.hostId;
      }
    }

    if (!hostId) {
      alert('No se pudo encontrar el ID del propietario.');
      return;
    }

    this.currentHostId = hostId;
    this.showOwnerModal = true;
    this.loadingOwnerDetails = true;
    this.selectedOwnerDetails = null;
    this.selectedOwnerVenues = null;
    this.payments = null;
    this.totalEarningsSum = 0;

    let token = '';
    try {
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('accessToken') || '';
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': '69420'
    };

    // Fetch host details
    this.http.get<any>(`${environment.apiUrl}/host-detail/${hostId}`, { headers }).subscribe({
      next: (details) => {
        this.selectedOwnerDetails = details;
        this.checkLoadingState();
      },
      error: (err) => {
        console.error('Error fetching host details:', err);
        this.loadingOwnerDetails = false;
        this.cdr.detectChanges();
        alert('No se pudieron cargar los detalles del propietario.');
      }
    });

    // Fetch host venues
    this.http.get<any[]>(`${environment.apiUrl}/venues/host/${hostId}`, { headers }).subscribe({
      next: (venues) => {
        this.selectedOwnerVenues = venues || [];
        this.totalEarningsSum = this.selectedOwnerVenues.reduce((sum, v) => sum + (v.totalEarnings || 0), 0);
        this.checkLoadingState();
      },
      error: (err) => {
        console.error('Error fetching host venues:', err);
        this.loadingOwnerDetails = false;
        this.cdr.detectChanges();
        alert('No se pudieron cargar las canchas del propietario.');
      }
    });

    // Fetch payments
    this.http.get<any[]>(`${environment.apiUrl}/host-debts/payments?hostId=${hostId}`, { headers }).subscribe({
      next: (data) => {
        this.payments = (data || []).map(item => ({
          id: item.id,
          date: this.formatPaymentDate(item.fechaPago),
          venue: item.nombreSalon || 'Cancha',
          docType: item.tipoDoc === '1' || item.tipoDoc === 1 ? 'DNI' : (item.tipoDoc === '2' || item.tipoDoc === 2 ? 'RUC' : item.tipoDoc),
          docNumber: item.nroDocumento,
          amount: item.monto,
          status: item.estado === 2 || item.estado === '2' ? 'Pagado' : `Estado ${item.estado}`
        }));
        this.checkLoadingState();
      },
      error: (err) => {
        console.error('Error fetching payments:', err);
        this.payments = [];
        this.checkLoadingState();
      }
    });
  }

  formatPaymentDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
      return `${day}/${month}/${year} ${strTime}`;
    } catch (e) {
      return dateStr;
    }
  }

  checkLoadingState(): void {
    if (this.selectedOwnerDetails !== null && this.selectedOwnerVenues !== null && this.payments !== null) {
      this.loadingOwnerDetails = false;
      this.cdr.detectChanges();
    }
  }

  closeOwnerModal(): void {
    this.showOwnerModal = false;
    this.selectedOwnerDetails = null;
    this.selectedOwnerVenues = null;
    this.currentHostId = null;
    this.payments = null;
  }

  sendReminder(): void {
    this.showReminderModal = true;
  }

  closeReminderModal(): void {
    if (!this.sendingReminder) {
      this.showReminderModal = false;
    }
  }

  confirmSendReminder(): void {
    if (!this.currentHostId || !this.selectedOwnerDetails) {
      alert('No se pudo determinar la información del propietario.');
      return;
    }

    this.sendingReminder = true;
    
    let token = '';
    try {
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('accessToken') || '';
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': '69420'
    };

    const debtAmountFormatted = (this.selectedOwnerDetails.debtAmount || 0).toFixed(2);
    const delayDays = this.selectedOwnerDetails.delayDays || 0;

    const payload = {
      title: '⚠️ Deuda Vencida',
      body: `Tienes una deuda vencida de S/ ${debtAmountFormatted} con ${delayDays} días de retraso. Regulariza tu pago para reactivar tus salones`
    };

    this.http.post<any>(
      `${environment.apiUrl}/api/v1/admin/users/${this.currentHostId}/notify-debt`,
      payload,
      { headers }
    ).subscribe({
      next: (response) => {
        this.sendingReminder = false;
        this.showReminderModal = false;
        this.cdr.detectChanges();
        alert('Notificación de recordatorio enviada con éxito.');
      },
      error: (err) => {
        console.error('Error sending debt notification:', err);
        this.sendingReminder = false;
        this.cdr.detectChanges();
        alert('Ocurrió un error al enviar la notificación de recordatorio.');
      }
    });
  }
}
