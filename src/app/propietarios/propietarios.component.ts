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
}
