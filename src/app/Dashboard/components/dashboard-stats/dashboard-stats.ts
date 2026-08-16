import { Component, inject, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../Enviroments/Enviroment';
import { retry } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-stats',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-stats.html',
  styleUrl: './dashboard-stats.css',
})
export class DashboardStats implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private apiUrl = environment.apiUrl;

  totalSalones: number = 0;
  totalPropietarios: number = 0;
  activeSalonesCount: number = 0;
  inactiveSalonesCount: number = 0;

  // Bookings stats
  currentMonthBookingsCount: number = 0;
  totalBookingsCount: number = 0;

  // Commissions stats
  currentMonthCommissions: number = 0;
  totalAccumulatedCommissions: number = 0;
  commissionVariationPercent: string = '0%';
  isVariationPositive: boolean = true;

  // Real banner stats
  pendingPaymentsCount: number = 0;
  pendingDebtorsCount: number = 0;
  pendingDebtsTotalAmount: number = 0;

  // Cache of unfiltered datasets
  private allBookingsData: any[] = [];
  private allDebtorsData: any[] = [];
  private allHostDebtsData: any[] = [];
  private allVenuesReportData: any[] = [];
  private allHostDebtsVenuesData: any[] = [];

  private _filteredVenues: any[] | null = null;
  private _filteredBookings: any[] | null = null;

  @Input() set filteredVenues(list: any[] | null) {
    this._filteredVenues = list;
    // Defer to avoid NG0100: mutations after parent's change detection pass
    Promise.resolve().then(() => {
      this.calculateStats();
      this.filterDebtors();
      this.cdr.markForCheck();
    });
  }

  @Input() set filteredBookings(list: any[] | null) {
    this._filteredBookings = list;
    Promise.resolve().then(() => {
      this.filterBookings();
      this.cdr.markForCheck();
    });
  }

  ngOnInit() {
    this.fetchDefaultStats();
    this.fetchVenuesReport();
    this.fetchHostDebtsVenues();
    this.fetchBookings();
    this.fetchDebtors();
    this.fetchHostDebts();
  }

  fetchDefaultStats() {
    this.http.get<any>(`${this.apiUrl}/venues/report/stats`, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    }).pipe(
      retry({ count: 2, delay: 1500 })
    ).subscribe({
      next: (data) => {
        if (!this._filteredVenues) {
          if (data && typeof data.totalSalones === 'number') {
            this.totalSalones = data.totalSalones;
          }
          if (data && typeof data.totalPropietarios === 'number') {
            this.totalPropietarios = data.totalPropietarios;
          }

          const inactive = data?.inactiveSalones ?? data?.salonesInactivos ?? data?.inactivosCount ?? data?.inactivos ?? data?.inactiveSalonesCount ?? data?.disabledVenuesCount ?? data?.inactives;
          const active = data?.activeSalones ?? data?.salonesActivos ?? data?.activosCount ?? data?.activos ?? data?.activeSalonesCount ?? data?.actives;

          if (typeof inactive === 'number' && inactive > 0) {
            this.inactiveSalonesCount = inactive;
            if (this.totalSalones) {
              this.activeSalonesCount = Math.max(0, this.totalSalones - inactive);
            }
          }
          if (typeof active === 'number') {
            this.activeSalonesCount = active;
          }

          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Error fetching dashboard stats:', err);
      }
    });
  }

  private isVenueInactive(v: any): boolean {
    if (!v) return false;

    // Explicit false / 0 in boolean or numeric properties
    if (v.active === false || v.active === 0 || v.active === 'false' || v.active === '0') return true;
    if (v.isActive === false || v.isActive === 0 || v.isActive === 'false' || v.isActive === '0') return true;
    if (v.is_active === false || v.is_active === 0 || v.is_active === 'false' || v.is_active === '0') return true;
    if (v.enabled === false || v.enabled === 0 || v.enabled === 'false') return true;
    if (v.isEnabled === false || v.isEnabled === 0 || v.isEnabled === 'false') return true;
    if (v.disabled === true || v.disabled === 1 || v.disabled === 'true') return true;
    if (v.isDisabled === true || v.isDisabled === 1 || v.isDisabled === 'true') return true;

    // Disabled status object
    if (v.disabledStatus && (v.disabledStatus.status || v.disabledStatus.description || v.disabledStatus.disabledReason)) return true;

    // String field helper
    const isInactiveStr = (str: any) => {
      if (typeof str !== 'string') return false;
      const s = str.trim().toUpperCase();
      return s === 'INACTIVO' || s === 'INACTIVE' || s === 'DESACTIVADO' || s === 'DISABLED' || s === 'DESHABILITADO' || s === 'SUSPENDIDO' || s === 'BLOQUEADO' || s === 'ELIMINADO' || s === 'OVERDUE' || s === 'DEBT_DISABLED';
    };

    if (isInactiveStr(v.status) || isInactiveStr(v.estado) || isInactiveStr(v.debtStatus) || isInactiveStr(v.condition)) return true;
    if (v.status === 0 || v.status === '0' || v.estado === 0 || v.estado === '0') return true;

    return false;
  }

  fetchVenuesReport() {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<any>(`${this.apiUrl}/venues/report/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (response) => {
        let list: any[] = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (response && Array.isArray(response.data)) {
          list = response.data;
        } else if (response && Array.isArray(response.content)) {
          list = response.content;
        }

        this.allVenuesReportData = list || [];
        this.recalculateVenueCounts();
        this.calculateCommissions();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching venues report for stats:', err);
      }
    });
  }

  fetchHostDebtsVenues() {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<any[]>(`${this.apiUrl}/host-debts/venues/report`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (debtsVenues) => {
        if (Array.isArray(debtsVenues) && debtsVenues.length > 0) {
          this.allHostDebtsVenuesData = debtsVenues;
          this.recalculateVenueCounts();
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Error fetching host-debts venues report:', err);
      }
    });
  }

  recalculateVenueCounts() {
    const list = this._filteredVenues || this.allVenuesReportData;
    if (!list || list.length === 0) return;

    // Set of venue IDs marked inactive in host-debts venues report
    const inactiveVenueIdsFromHostDebts = new Set<string>();
    (this.allHostDebtsVenuesData || []).forEach((hv: any) => {
      if (this.isVenueInactive(hv)) {
        const id = hv.venueId || hv.id;
        if (id) inactiveVenueIdsFromHostDebts.add(id);
      }
    });

    let inactiveCount = 0;
    list.forEach((v: any) => {
      const id = v.venueId || v.id;
      if (this.isVenueInactive(v) || (id && inactiveVenueIdsFromHostDebts.has(id))) {
        inactiveCount++;
      }
    });

    // If list items didn't contain explicit inactive flags but allHostDebtsVenuesData found disabled venues
    if (inactiveCount === 0 && inactiveVenueIdsFromHostDebts.size > 0) {
      inactiveCount = inactiveVenueIdsFromHostDebts.size;
    }

    this.inactiveSalonesCount = inactiveCount;
    this.activeSalonesCount = Math.max(0, list.length - inactiveCount);
    if (!this.totalSalones || this._filteredVenues) {
      this.totalSalones = list.length;
    }
  }

  calculateStats() {
    this.recalculateVenueCounts();
    if (this._filteredVenues) {
      this.totalPropietarios = new Set(this._filteredVenues.map(v => v.ownerEmail)).size;
    } else {
      this.fetchDefaultStats();
    }
    this.calculateCommissions();
  }

  fetchBookings() {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<any[]>(`${this.apiUrl}/bookings/admin/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        this.allBookingsData = data || [];
        this.filterBookings();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching bookings for stats:', err);
      }
    });
  }

  fetchDebtors() {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<any[]>(`${this.apiUrl}/host-debts/debtors`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        this.allDebtorsData = data || [];
        this.filterDebtors();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching debtors for stats:', err);
      }
    });
  }

  fetchHostDebts() {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<any[]>(`${this.apiUrl}/host-debts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (debts) => {
        this.allHostDebtsData = debts || [];
        this.calculateCommissions();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching host debts:', err);
      }
    });
  }

  private getYearMonth(dateVal: any): { year: number; month: number } | null {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') {
      const clean = dateVal.split('T')[0];
      const parts = clean.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          return { year: y, month: m };
        }
      }
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return { year: d.getFullYear(), month: d.getMonth() };
  }

  calculateCommissions() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const currentKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const prevKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;

    const monthMap = new Map<string, number>();
    let totalSum = 0;

    (this.allHostDebtsData || []).forEach((d: any) => {
      const commAmount = (d.commissionAmount !== undefined && d.commissionAmount !== null && d.commissionAmount > 0)
        ? d.commissionAmount
        : (d.paidAmount || 0);

      const paidVal = (d.paidAmount !== undefined && d.paidAmount !== null && d.paidAmount > 0)
        ? d.paidAmount
        : commAmount;

      totalSum += paidVal;

      const dateVal = d.cycleStart || d.createdAt || d.date;
      const ym = this.getYearMonth(dateVal);
      if (ym) {
        const key = `${ym.year}-${String(ym.month + 1).padStart(2, '0')}`;
        const prev = monthMap.get(key) || 0;
        monthMap.set(key, prev + commAmount);
      }
    });

    let currentMonthSum = monthMap.get(currentKey) || 0;
    let prevMonthSum = monthMap.get(prevKey) || 0;

    // Fallback 1: Calculate commission sum from venue reports list if current month sum from host-debts is 0
    const venueList = this._filteredVenues || this.allVenuesReportData || [];
    const venueCommsSum = venueList.reduce((sum: number, v: any) => sum + (v.commissionLastPeriod || v.totalCommissions || 0), 0);

    if (currentMonthSum === 0 && venueCommsSum > 0) {
      currentMonthSum = venueCommsSum;
    }

    // Fallback 2: If currentMonthSum is still 0, take the latest available month from host debts
    if (currentMonthSum === 0 && monthMap.size > 0) {
      const sortedKeys = Array.from(monthMap.keys()).sort().reverse();
      const latestKey = sortedKeys[0];
      currentMonthSum = monthMap.get(latestKey) || 0;
      if (sortedKeys.length > 1) {
        prevMonthSum = monthMap.get(sortedKeys[1]) || 0;
      }
    }

    if (totalSum === 0 && currentMonthSum > 0) {
      totalSum = currentMonthSum;
    }

    this.currentMonthCommissions = currentMonthSum;
    this.totalAccumulatedCommissions = totalSum;

    if (prevMonthSum === 0) {
      if (currentMonthSum > 0) {
        this.commissionVariationPercent = '↗ +100%';
        this.isVariationPositive = true;
      } else {
        this.commissionVariationPercent = '0%';
        this.isVariationPositive = true;
      }
    } else {
      const diff = ((currentMonthSum - prevMonthSum) / prevMonthSum) * 100;
      const sign = diff >= 0 ? '↗ +' : '↘ ';
      this.commissionVariationPercent = `${sign}${diff.toFixed(0)}%`;
      this.isVariationPositive = diff >= 0;
    }
  }

  filterBookings() {
    const list = this._filteredBookings || this.allBookingsData;
    // Count bookings with status == 1 (PENDING) and voucherUrl is present
    this.pendingPaymentsCount = list.filter((b: any) => b.status === 1 && b.voucherUrl).length;

    this.totalBookingsCount = list.length;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    this.currentMonthBookingsCount = list.filter((b: any) => {
      const dateStr = b.bookingDate || b.createdAt || b.date;
      const ym = this.getYearMonth(dateStr);
      return ym ? (ym.year === currentYear && ym.month === currentMonth) : false;
    }).length;
  }

  filterDebtors() {
    let list = [...this.allDebtorsData];
    if (this._filteredVenues) {
      const allowedOwnerEmails = new Set(this._filteredVenues.map(v => v.ownerEmail));
      list = list.filter((d: any) => allowedOwnerEmails.has(d.email));
    }
    this.pendingDebtorsCount = list.length;
    this.pendingDebtsTotalAmount = list.reduce((sum: number, d: any) => sum + (d.pendingCommission || 0), 0);
  }
}
