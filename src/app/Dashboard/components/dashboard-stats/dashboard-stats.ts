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

  totalSalones: number = 4;
  totalPropietarios: number = 1;

  // Real banner stats
  pendingPaymentsCount: number = 0;
  pendingDebtorsCount: number = 0;
  pendingDebtsTotalAmount: number = 0;

  // Cache of unfiltered datasets
  private allBookingsData: any[] = [];
  private allDebtorsData: any[] = [];

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
    this.fetchBookings();
    this.fetchDebtors();
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
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Error fetching dashboard stats:', err);
      }
    });
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

  calculateStats() {
    if (this._filteredVenues) {
      this.totalSalones = this._filteredVenues.length;
      this.totalPropietarios = new Set(this._filteredVenues.map(v => v.ownerEmail)).size;
    } else {
      this.fetchDefaultStats();
    }
  }

  filterBookings() {
    const list = this._filteredBookings || this.allBookingsData;
    // Count bookings with status == 1 (PENDING) and voucherUrl is present
    this.pendingPaymentsCount = list.filter((b: any) => b.status === 1 && b.voucherUrl).length;
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
