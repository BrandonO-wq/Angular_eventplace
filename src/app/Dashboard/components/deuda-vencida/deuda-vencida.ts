import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef, Input } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../Enviroments/Enviroment';

@Component({
  selector: 'app-deuda-vencida',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deuda-vencida.html',
  styleUrl: './deuda-vencida.css',
})
export class DeudaVencida implements OnInit {
  debtors: any[] = [];

  private allDebtorsData: any[] = [];
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
      this.fetchDebtors();
    }
  }

  fetchDebtors() {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<any[]>(`${environment.apiUrl}/host-debts/debtors`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        this.allDebtorsData = data;
        this.applyFiltering();
      },
      error: (err) => {
        console.error('Error fetching debtors:', err);
      }
    });
  }

  applyFiltering() {
    let data = [...this.allDebtorsData];
    if (this._filteredVenues) {
      const allowedOwnerEmails = new Set(this._filteredVenues.map(v => v.ownerEmail));
      data = data.filter(d => allowedOwnerEmails.has(d.email));
    }
    this.debtors = data;
    this.cdr.detectChanges();
  }
}
