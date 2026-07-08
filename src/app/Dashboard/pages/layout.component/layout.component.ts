import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BarrasuperiorComponent } from '../../components/barrasuperior/barrasuperior.component/barrasuperior.component';
import { BarralateralComponent } from '../../components/barralateral/barralateral.component/barralateral.component';
import { TopCanchasComponent } from '../../components/top-canchas/top-canchas.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../Enviroments/Enviroment';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    BarrasuperiorComponent,
    BarralateralComponent,
    TopCanchasComponent
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent implements OnInit {
  bookingsData: any[] = [];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchBookings();
    }
  }

  fetchBookings() {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<any[]>(`${environment.apiUrl}/bookings/host/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    })
      .subscribe({
        next: (data) => {
          console.log('Bookings API response:', data);
          this.bookingsData = data;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching bookings:', err);
        }
      });
  }
}
