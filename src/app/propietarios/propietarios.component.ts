import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-propietarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './propietarios.component.html',
  styleUrls: ['./propietarios.component.css']
})
export class PropietariosComponent implements OnInit {
  hosts: RegisteredHost[] = [];
  filteredHosts: RegisteredHost[] = [];
  pagedHosts: RegisteredHost[] = [];

  // KPIs
  totalPropietarios = 0;
  activosCount = 0;
  deudaVencidaCount = 0;
  totalCanchas = 0;
  totalIncome = 0;

  // Filtering & Pagination
  searchQuery = '';
  activeTab: 'Todos' | 'Activos' | 'Deuda Vencida' | 'Eliminados' = 'Todos';
  currentPage = 1;
  pageSize = 5;
  totalPages = 1;
  loading = false;
  errorMessage = '';

  // Owner details modal state
  showOwnerModal = false;
  selectedOwnerDetails: any = null;
  selectedOwnerVenues: any[] = [];
  loadingOwnerDetails = false;
  totalEarningsSum = 0;

  // Reminder modal state
  showReminderModal = false;
  sendingReminder = false;
  currentHostId: string | null = null;
  simulatedPayments: any[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchHosts();
  }

  fetchHosts(): void {
    this.loading = true;
    this.errorMessage = '';

    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<RegisteredHost[]>(`${environment.apiUrl}/host-debts/registered-hosts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        this.hosts = data;
        this.calculateKPIs();
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching hosts:', err);
        this.errorMessage = 'No se pudieron cargar los datos de los propietarios.';
        this.loading = false;
      }
    });
  }

  calculateKPIs(): void {
    this.totalPropietarios = this.hosts.length;

    // Activos count: status is NOT 'OVERDUE'
    this.activosCount = this.hosts.filter(h => h.statusLastPeriod !== 'OVERDUE').length;

    // Deuda Vencida count: status is 'OVERDUE'
    this.deudaVencidaCount = this.hosts.filter(h => h.statusLastPeriod === 'OVERDUE').length;

    // Total canchas
    this.totalCanchas = this.hosts.reduce((sum, h) => sum + (h.venuesCount || 0), 0);

    // Ingresos total
    this.totalIncome = this.hosts.reduce((sum, h) => sum + (h.totalIncomeLastPeriod || 0), 0);
  }

  applyFilters(): void {
    let result = [...this.hosts];

    // Search query filter (by name or email)
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(h =>
        (h.hostName && h.hostName.toLowerCase().includes(q)) ||
        (h.email && h.email.toLowerCase().includes(q))
      );
    }

    // Tab filter
    if (this.activeTab === 'Activos') {
      result = result.filter(h => h.statusLastPeriod !== 'OVERDUE');
    } else if (this.activeTab === 'Deuda Vencida') {
      result = result.filter(h => h.statusLastPeriod === 'OVERDUE');
    } else if (this.activeTab === 'Eliminados') {
      // No deleted field is in the API DTO, represent empty list or custom filter if needed.
      result = [];
    }

    this.filteredHosts = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  setTab(tab: 'Todos' | 'Activos' | 'Deuda Vencida' | 'Eliminados'): void {
    this.activeTab = tab;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredHosts.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedHosts = this.filteredHosts.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  // Helper formatting methods
  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  }

  getStatusBadgeClass(status: string | null): string {
    if (status === 'OVERDUE') return 'badge-danger';
    if (status === 'PENDING' || status === 'LEGACY_PENDING') return 'badge-warning';
    return 'badge-success'; // PAID or null
  }

  getStatusLabel(status: string | null): string {
    if (status === 'OVERDUE') return 'Deuda Vencida';
    if (status === 'PENDING' || status === 'LEGACY_PENDING') return 'Pendiente';
    return 'Al día'; // PAID or null
  }

  openOwnerModal(host: RegisteredHost): void {
    const hostId = host.hostId;
    if (!hostId) {
      alert('No se pudo encontrar el ID del propietario.');
      return;
    }

    this.currentHostId = hostId;
    this.showOwnerModal = true;
    this.loadingOwnerDetails = true;
    this.selectedOwnerDetails = null;
    this.selectedOwnerVenues = [];
    this.totalEarningsSum = 0;

    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
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
        alert('No se pudieron cargar los detalles del dueño.');
      }
    });

    // Fetch host venues
    this.http.get<any[]>(`${environment.apiUrl}/venues/host/${hostId}`, { headers }).subscribe({
      next: (venues) => {
        this.selectedOwnerVenues = venues || [];
        this.totalEarningsSum = this.selectedOwnerVenues.reduce((sum, v) => sum + (v.totalEarnings || 0), 0);
        this.generateSimulatedPayments();
        this.checkLoadingState();
      },
      error: (err) => {
        console.error('Error fetching host venues:', err);
        this.loadingOwnerDetails = false;
        alert('No se pudieron cargar las canchas del dueño.');
      }
    });
  }

  generateSimulatedPayments(): void {
    const venues = this.selectedOwnerVenues || [];
    const venueName = venues.length > 0 ? venues[0].name : 'Cancha Huaraz';
    
    // Generate 1 realistic payment as shown in screenshot
    this.simulatedPayments = [
      {
        id: 1,
        date: '18/06/2026 12:41 AM',
        venue: venueName,
        docType: 'BOLETA',
        docNumber: '70983830',
        amount: 20.00,
        status: 'Aprobado'
      }
    ];

    // Add a second one if they have more venues for variety
    if (venues.length > 1) {
      this.simulatedPayments.push({
        id: 2,
        date: '10/06/2026 04:15 PM',
        venue: venues[1].name,
        docType: 'FACTURA',
        docNumber: '00192834',
        amount: 35.50,
        status: 'Aprobado'
      });
    }
  }

  checkLoadingState(): void {
    if (this.selectedOwnerDetails && this.selectedOwnerVenues) {
      this.loadingOwnerDetails = false;
    }
  }

  closeOwnerModal(): void {
    this.showOwnerModal = false;
    this.selectedOwnerDetails = null;
    this.selectedOwnerVenues = [];
    this.currentHostId = null;
    this.simulatedPayments = [];
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
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
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
        alert('Notificación de recordatorio enviada con éxito.');
      },
      error: (err) => {
        console.error('Error sending debt notification:', err);
        this.sendingReminder = false;
        alert('Ocurrió un error al enviar la notificación de recordatorio.');
      }
    });
  }
}
