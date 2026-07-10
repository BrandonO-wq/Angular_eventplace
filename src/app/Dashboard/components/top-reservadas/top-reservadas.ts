import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../Enviroments/Enviroment';

interface VenueBooking {
  id: string;
  name: string;
  ownerName: string;
  bookingsCount: number;
}

@Component({
  selector: 'app-top-reservadas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-reservadas.html',
  styleUrl: './top-reservadas.css',
})
export class TopReservadas implements OnInit {
  venues: VenueBooking[] = [];
  maxBookings = 1;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchVenues();
    }
  }

  fetchVenues() {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<VenueBooking[]>(`${environment.apiUrl}/venues/report/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        // Sort descending, take top 5
        this.venues = data
          .sort((a, b) => b.bookingsCount - a.bookingsCount)
          .slice(0, 5);
        this.maxBookings = this.venues.length > 0
          ? Math.max(...this.venues.map(v => v.bookingsCount), 1)
          : 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching venues bookings:', err);
      }
    });
  }

  getBarWidth(count: number): string {
    if (this.maxBookings === 0) return '0%';
    return `${(count / this.maxBookings) * 96}%`;
  }
}
