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
  eventTypeFilter = '';
  stateFilter = '';
  sortFilter = '';
  
  loading = false;
  errorMessage = '';

  // Owner details modal state
  showOwnerModal = false;
  selectedOwnerDetails: any = null;
  selectedOwnerVenues: any[] = [];
  loadingOwnerDetails = false;
  totalEarningsSum = 0;
  registeredHosts: any[] = [];

  // Reminder modal state
  showReminderModal = false;
  sendingReminder = false;
  currentHostId: string | null = null;
  simulatedPayments: any[] = [];

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
          this.applyFilters();
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

  applyFilters(): void {
    let result = [...this.salones];

    // Búsqueda por texto
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(query)) ||
        (s.address && s.address.toLowerCase().includes(query))
      );
    }

    // Filtro por tipo de evento
    if (this.eventTypeFilter) {
      result = result.filter(s => {
        const types = (s as any).eventTypes || [];
        return types.some((t: string) => t.toLowerCase() === this.eventTypeFilter.toLowerCase());
      });
    }

    // Filtro por estado
    if (this.stateFilter) {
      if (this.stateFilter === 'activos') {
        result = result.filter(s => {
          const isActive = (s as any).active === true || (s as any).status === 'ACTIVO' || (s as any).estado === 'ACTIVO' || (s as any).estado === 'Activo';
          return isActive || ((s as any).active === undefined && (s as any).status === undefined && (s as any).estado === undefined); // Asumimos activo por defecto si no hay prop
        });
      } else if (this.stateFilter === 'inactivos') {
        result = result.filter(s => (s as any).active === false || (s as any).status === 'INACTIVO' || (s as any).estado === 'INACTIVO' || (s as any).estado === 'Inactivo');
      } else if (this.stateFilter === 'eliminados') {
        result = result.filter(s => (s as any).status === 'ELIMINADO' || (s as any).estado === 'ELIMINADO');
      }
    }

    // Filtro por ordenamiento
    if (this.sortFilter === 'menor_calificacion') {
      result.sort((a, b) => (a.reviewsAverage || 0) - (b.reviewsAverage || 0));
    } else if (this.sortFilter === 'sin_calificacion') {
      result = result.filter(s => !s.reviewsAverage || s.reviewsAverage === 0);
    } else if (this.sortFilter === 'mas_reservas') {
      result.sort((a, b) => (b.bookingsCount || 0) - (a.bookingsCount || 0));
    } else if (this.sortFilter === 'menos_reservas') {
      result.sort((a, b) => (a.bookingsCount || 0) - (b.bookingsCount || 0));
    } else if (this.sortFilter === 'mayores_ingresos') {
      result.sort((a, b) => (b.incomeLastPeriod || 0) - (a.incomeLastPeriod || 0));
    } else {
      // Por defecto o 'Mayor calificación'
      result.sort((a, b) => (b.reviewsAverage || 0) - (a.reviewsAverage || 0));
    }

    this.filteredSalones = result;
    this.calculateKPIs();
  }
}
