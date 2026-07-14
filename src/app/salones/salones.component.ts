import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../Enviroments/Enviroment';

export interface VenueReportBooking {
  id: string;
  name: string;
  ownerName: string;
  bookingsCount: number;
  address: string;
  latitude: number;
  longitude: number;
  bookingsLastMonthCount: number;
  incomeLastPeriod: number;
  commissionLastPeriod: number;
  ubigeo: string;
  reviewsCount: number;
  reviewsAverage: number;
}

@Component({
  selector: 'app-salones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './salones.component.html',
  styleUrls: ['./salones.component.css']
})
export class SalonesComponent implements OnInit {
  salones: VenueReportBooking[] = [];
  filteredSalones: VenueReportBooking[] = [];

  totalSalones = 0;
  activosCount = 0; // Assuming all are active as status is not provided
  reservasCount = 0;
  totalComisiones = 0;
  avgRating = 0;

  searchQuery = '';
  loading = false;
  errorMessage = '';

  // Owner details modal state
  showOwnerModal = false;
  selectedOwnerDetails: any = null;
  selectedOwnerVenues: any[] = [];
  loadingOwnerDetails = false;
  totalEarningsSum = 0;
  registeredHosts: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchSalones();
    this.fetchRegisteredHosts();
  }

  fetchRegisteredHosts(): void {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }
    this.http.get<any[]>(`${environment.apiUrl}/host-debts/registered-hosts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (hosts) => {
        this.registeredHosts = hosts || [];
      },
      error: (err) => {
        console.error('Error fetching registered hosts:', err);
      }
    });
  }

  openOwnerModal(salon: VenueReportBooking): void {
    let hostId = (salon as any).hostId || (salon as any).ownerId;
    if (!hostId && salon.ownerName) {
      const found = this.registeredHosts.find(
        h => h.hostName.toLowerCase() === salon.ownerName.toLowerCase()
      );
      if (found) {
        hostId = found.hostId;
      }
    }

    if (!hostId) {
      alert('No se pudo encontrar el ID del dueño de este salón.');
      return;
    }

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
        this.checkLoadingState();
      },
      error: (err) => {
        console.error('Error fetching host venues:', err);
        this.loadingOwnerDetails = false;
        alert('No se pudieron cargar las canchas del dueño.');
      }
    });
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
  }

  sendReminder(): void {
    alert(`Recordatorio enviado con éxito a ${this.selectedOwnerDetails?.name}`);
  }

  fetchSalones(): void {
    this.loading = true;
    this.errorMessage = '';

    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }

    this.http.get<any>(`${environment.apiUrl}/venues/report/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (response) => {
        try {
          console.log('Respuesta de /venues/report/bookings:', response);
          
          let dataArray: VenueReportBooking[] = [];
          if (Array.isArray(response)) {
            dataArray = response;
          } else if (response && Array.isArray(response.data)) {
            dataArray = response.data;
          } else if (response && Array.isArray(response.content)) {
            dataArray = response.content;
          } else if (response && typeof response === 'object') {
            dataArray = [response as VenueReportBooking];
          }

          this.salones = dataArray || [];
          this.filteredSalones = dataArray || [];
          this.calculateKPIs();
        } catch (e) {
          console.error('Error al procesar los datos:', e);
          this.errorMessage = 'Hubo un error al procesar la respuesta del servidor.';
        } finally {
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Error fetching salones:', err);
        this.errorMessage = 'No se pudieron cargar los datos de los salones.';
        this.loading = false;
      }
    });
  }

  calculateKPIs(): void {
    this.totalSalones = this.filteredSalones.length;
    this.activosCount = this.filteredSalones.length;
    this.reservasCount = this.filteredSalones.reduce((sum, s) => sum + (s.bookingsCount || 0), 0);
    this.totalComisiones = this.filteredSalones.reduce((sum, s) => sum + (s.commissionLastPeriod || 0), 0);
    
    if (this.filteredSalones.length > 0) {
      const totalRatings = this.filteredSalones.reduce((sum, s) => sum + (s.reviewsAverage || 0), 0);
      this.avgRating = totalRatings / this.filteredSalones.length;
    } else {
      this.avgRating = 0;
    }
  }

  onSearchChange(): void {
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      this.filteredSalones = this.salones;
    } else {
      const query = this.searchQuery.toLowerCase().trim();
      this.filteredSalones = this.salones.filter(s => 
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(query)) ||
        (s.address && s.address.toLowerCase().includes(query))
      );
    }
    this.calculateKPIs();
  }
}
