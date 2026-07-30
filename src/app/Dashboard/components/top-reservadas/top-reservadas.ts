import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef, Input } from '@angular/core';
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

  private allVenuesData: VenueBooking[] = [];
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
        this.allVenuesData = data;
        this.applyFiltering();
      },
      error: (err) => {
        console.error('Error fetching venues bookings:', err);
      }
    });
  }

  applyFiltering() {
    let data = [...this.allVenuesData];
    if (this._filteredVenues) {
      const allowedIds = new Set(this._filteredVenues.map(v => v.venueId));
      data = data.filter(v => allowedIds.has(v.id));
    }
    this.venues = data
      .sort((a, b) => b.bookingsCount - a.bookingsCount)
      .slice(0, 5);
    this.maxBookings = this.venues.length > 0
      ? Math.max(...this.venues.map(v => v.bookingsCount), 1)
      : 1;
    this.cdr.detectChanges();
  }

  getBarWidth(count: number): string {
    if (this.maxBookings === 0) return '0%';
    return `${(count / this.maxBookings) * 96}%`;
  }
}
