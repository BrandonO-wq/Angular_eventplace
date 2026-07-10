import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
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
        this.debtors = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching debtors:', err);
      }
    });
  }
}
