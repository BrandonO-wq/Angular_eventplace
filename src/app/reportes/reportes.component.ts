import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../Enviroments/Enviroment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { retry } from 'rxjs/operators';

// Import child components
import { TopSalonesComponent } from '../Dashboard/components/top-salones/top-salones.component';
import { TopReservadas } from '../Dashboard/components/top-reservadas/top-reservadas';
import { DeudaVencida } from '../Dashboard/components/deuda-vencida/deuda-vencida';
import { EvolucionComisiones } from '../Dashboard/components/evolucion-comisiones/evolucion-comisiones';
import { DistribucionEventos } from '../Dashboard/components/distribucion-eventos/distribucion-eventos';
import { DashboardStats } from '../Dashboard/components/dashboard-stats/dashboard-stats';
import { CrecimientoPlataforma } from '../Dashboard/components/crecimiento-plataforma/crecimiento-plataforma';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TopSalonesComponent,
    TopReservadas,
    DeudaVencida,
    EvolucionComisiones,
    DistribucionEventos,
    DashboardStats,
    CrecimientoPlataforma
  ],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent implements OnInit {
  // Ubigeo data
  departamentos: any[] = [];
  provincias: any[] = [];
  distritos: any[] = [];

  // Filter selections
  selectedDepartamento: string = '';
  selectedProvincia: string = '';
  selectedDistrito: string = '';

  // Main datasets
  allVenues: any[] = [];
  allBookings: any[] = [];

  // Filtered datasets passed to children
  filteredVenues: any[] | null = null;
  filteredBookings: any[] = [];

  // Date Range Selection (Dinámico y reactivo)
  activeRange: string = 'trimestre';
  dateRangeStr: string = '';

  loading = true;
  errorVenues = false;   // true si /venues/report devuelve error
  generatingPdf = false;
  generatingExcel = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setDateRange(this.activeRange);
    if (isPlatformBrowser(this.platformId)) {
      this.loadInitialData();
    }
  }

  loadInitialData() {
    this.loading = true;
    this.errorVenues = false;
    const token = this.getToken();

    // Fetch ubigeos
    this.http.get<any>(`${environment.apiUrl}/ubigeos`, {
      headers: { 'ngrok-skip-browser-warning': '69420' }
    }).subscribe({
      next: (res) => {
        this.departamentos = res.departamentos || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching ubigeos:', err)
    });

    // Fetch venues report
    this.http.get<any[]>(`${environment.apiUrl}/host-debts/venues/report`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).pipe(
      retry({ count: 2, delay: 1500 })
    ).subscribe({
      next: (venues) => {
        this.allVenues = venues || [];
        this.errorVenues = false;
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error fetching venues report:', err);
        this.errorVenues = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    // Fetch bookings summary
    this.http.get<any[]>(`${environment.apiUrl}/bookings/admin/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).pipe(
      retry({ count: 2, delay: 1500 })
    ).subscribe({
      next: (bookings) => {
        this.allBookings = bookings || [];
        this.applyFilters();
      },
      error: (err) => console.error('Error fetching bookings summary:', err)
    });
  }

  onDepartamentoChange() {
    this.selectedProvincia = '';
    this.selectedDistrito = '';
    this.distritos = [];
    
    if (this.selectedDepartamento) {
      const dept = this.departamentos.find(d => d.code === this.selectedDepartamento);
      this.provincias = dept ? dept.provincias : [];
    } else {
      this.provincias = [];
    }
    
    this.applyFilters();
  }

  onProvinciaChange() {
    this.selectedDistrito = '';
    
    if (this.selectedProvincia) {
      const dept = this.departamentos.find(d => d.code === this.selectedDepartamento);
      if (dept) {
        const prov = dept.provincias.find((p: any) => p.code === this.selectedProvincia);
        this.distritos = prov ? prov.distritos : [];
      } else {
        this.distritos = [];
      }
    } else {
      this.distritos = [];
    }
    
    this.applyFilters();
  }

  onDistritoChange() {
    this.applyFilters();
  }

  formatDateSpanish(d: Date): string {
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  }

  getCurrentDateRange(range: string): { start: Date; end: Date; label: string } {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (range === 'semana') {
      start.setDate(end.getDate() - 6);
    } else if (range === 'mes') {
      start.setMonth(end.getMonth() - 1);
    } else if (range === 'trimestre') {
      start.setMonth(end.getMonth() - 3);
    } else if (range === 'ano') {
      start.setFullYear(end.getFullYear() - 1);
    }

    const label = `${this.formatDateSpanish(start)} - ${this.formatDateSpanish(end)}`;
    return { start, end, label };
  }

  private parseBookingDate(b: any): Date | null {
    const raw = b.bookingDate || b.createdAt || b.date;
    if (!raw) return null;
    if (typeof raw === 'string') {
      const datePart = raw.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return new Date(year, month, day, 12, 0, 0);
        }
      }
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  applyFilters() {
    let tempVenues = [...this.allVenues];

    if (this.selectedDistrito) {
      tempVenues = tempVenues.filter(v => v.ubigeo === this.selectedDistrito);
    } else if (this.selectedProvincia) {
      tempVenues = tempVenues.filter(v => v.ubigeo && v.ubigeo.startsWith(this.selectedProvincia));
    } else if (this.selectedDepartamento) {
      tempVenues = tempVenues.filter(v => v.ubigeo && v.ubigeo.startsWith(this.selectedDepartamento));
    }

    // If no filter is active, pass null to trigger default fallback in components
    const isFilterActive = !!(this.selectedDepartamento || this.selectedProvincia || this.selectedDistrito);
    this.filteredVenues = isFilterActive ? tempVenues : null;

    // Filter bookings based on filtered venues and active date range
    const { start, end } = this.getCurrentDateRange(this.activeRange);
    const allowedVenueIds = isFilterActive ? new Set(tempVenues.map(v => v.venueId)) : null;

    this.filteredBookings = this.allBookings.filter(b => {
      if (allowedVenueIds && !allowedVenueIds.has(b.venueId)) {
        return false;
      }
      const bDate = this.parseBookingDate(b);
      if (bDate) {
        return bDate >= start && bDate <= end;
      }
      return true;
    });

    this.loading = false;
    this.cdr.detectChanges();
  }

  clearFilters() {
    this.selectedDepartamento = '';
    this.selectedProvincia = '';
    this.selectedDistrito = '';
    this.provincias = [];
    this.distritos = [];
    this.applyFilters();
  }

  // Date Range Selector logic (Calculado dinámicamente)
  setDateRange(range: string) {
    this.activeRange = range;
    const { label } = this.getCurrentDateRange(range);
    this.dateRangeStr = label;
    this.applyFilters();
  }

  get selectedLocationName(): string {
    if (this.selectedDistrito) {
      const dist = this.distritos.find(d => d.code === this.selectedDistrito);
      return dist ? dist.name : '';
    }
    if (this.selectedProvincia) {
      const prov = this.provincias.find(p => p.code === this.selectedProvincia);
      return prov ? prov.name : '';
    }
    if (this.selectedDepartamento) {
      const dept = this.departamentos.find(d => d.code === this.selectedDepartamento);
      return dept ? dept.name : '';
    }
    return '';
  }

  private getToken(): string {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      try {
        if (typeof localStorage !== 'undefined') {
          token = localStorage.getItem('accessToken') || '';
        }
      } catch (e) {
        console.error('Error accessing localStorage:', e);
      }
    }
    return token;
  }

  generatePDF() {
    this.generatingPdf = true;
    const token = this.getToken();

    this.http.get<any[]>(`${environment.apiUrl}/venues/report/detailed`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        try {
          this.buildPDF(data);
        } catch (e) {
          console.error('Error rendering PDF:', e);
          alert('Error al dar formato al archivo PDF.');
        } finally {
          this.generatingPdf = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error fetching detailed report:', err);
        this.generatingPdf = false;
        this.cdr.detectChanges();
        alert('Ocurrió un error al generar el PDF del reporte. Inténtelo de nuevo.');
      }
    });
  }

  buildPDF(data: any[]) {
    let filteredData = [...data];
    
    // Filter by ubigeo if selected
    if (this.selectedDistrito) {
      filteredData = filteredData.filter(v => v.ubigeo === this.selectedDistrito);
    } else if (this.selectedProvincia) {
      filteredData = filteredData.filter(v => v.ubigeo && v.ubigeo.startsWith(this.selectedProvincia));
    } else if (this.selectedDepartamento) {
      filteredData = filteredData.filter(v => v.ubigeo && v.ubigeo.startsWith(this.selectedDepartamento));
    }

    if (filteredData.length === 0) {
      alert('No hay datos para exportar con los filtros de ubicación seleccionados.');
      return;
    }

    // Filter bookings within each venue by active date range
    const { start, end } = this.getCurrentDateRange(this.activeRange);

    const venuesWithFilteredBookings = filteredData.map(venue => {
      const bookingsInRange = (venue.bookings || []).filter((b: any) => {
        const bDate = this.parseBookingDate(b);
        if (!bDate) return true;
        return bDate >= start && bDate <= end;
      });

      const totalIncome = bookingsInRange.reduce((sum: number, b: any) => sum + parseFloat(b.totalAmount || 0), 0);
      const totalCommissions = bookingsInRange.reduce((sum: number, b: any) => sum + parseFloat(b.commission || 0), 0);
      const totalEarnings = bookingsInRange.reduce((sum: number, b: any) => sum + parseFloat(b.earnings || 0), 0);

      return {
        ...venue,
        bookings: bookingsInRange,
        bookingsCount: bookingsInRange.length,
        totalIncome,
        totalCommissions,
        totalEarnings
      };
    });

    // If there are venues with bookings in this period, show those; otherwise show filtered venues with 0 bookings
    const venuesToExport = venuesWithFilteredBookings.some(v => v.bookingsCount > 0)
      ? venuesWithFilteredBookings.filter(v => v.bookingsCount > 0)
      : venuesWithFilteredBookings;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const formatDateTime = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? dateStr : date.toLocaleString('es-PE', { hour12: true });
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    // Global location label in header: reflects user filter or "TODAS LAS UBICACIONES"
    const globalLocationLabel = this.selectedLocationName
      ? this.selectedLocationName.toUpperCase()
      : 'TODAS LAS UBICACIONES';

    venuesToExport.forEach((venue, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Title
      doc.setTextColor(30, 58, 138); // #1e3a8a
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte Global de Estadísticas y Reservas', 105, 20, { align: 'center' });

      // Period
      doc.setTextColor(71, 85, 105); // #475569
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${this.dateRangeStr}`, 105, 27, { align: 'center' });

      // Global Location Filter
      doc.setTextColor(37, 99, 235); // #2563eb
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Ubicación: ${globalLocationLabel}`, 105, 34, { align: 'center' });

      // Owner & Venue Info
      doc.setTextColor(15, 23, 42); // #0f172a
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Propietario: ${venue.ownerName || 'N/A'} (${venue.ownerEmail || 'N/A'})`, 15, 45);
      
      doc.setTextColor(29, 78, 216); // #1d4ed8
      doc.setFont('helvetica', 'bold');
      doc.text(`Salón: ${venue.venueName || 'N/A'}`, 15, 51);

      doc.setTextColor(100, 116, 139); // #64748b
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ubicación del Salón: ${venue.ubigeoText || 'N/A'}`, 15, 57);

      // Bookings Table
      const tableHeaders = ['Cliente', 'F. Creación', 'F. Reserva', 'Horario', 'Ingreso', 'Comisión', 'Ganancia'];
      
      let tableRows: any[] = [];
      if (venue.bookings && venue.bookings.length > 0) {
        tableRows = venue.bookings.map((b: any) => [
          b.clientName || 'N/A',
          formatDateTime(b.createdAt),
          formatDate(b.bookingDate),
          b.bookingHours || 'N/A',
          `S/ ${parseFloat(b.totalAmount || 0).toFixed(2)}`,
          `S/ ${parseFloat(b.commission || 0).toFixed(2)}`,
          `S/ ${parseFloat(b.earnings || 0).toFixed(2)}`
        ]);
      } else {
        tableRows = [[
          { content: 'No se registraron reservas en este período', colSpan: 4, styles: { halign: 'center', textColor: [100, 116, 139] } },
          'S/ 0.00',
          'S/ 0.00',
          'S/ 0.00'
        ]];
      }

      const tableFoot = [[
        'Total',
        '',
        '',
        '',
        `S/ ${parseFloat(venue.totalIncome || 0).toFixed(2)}`,
        `S/ ${parseFloat(venue.totalCommissions || 0).toFixed(2)}`,
        `S/ ${parseFloat(venue.totalEarnings || 0).toFixed(2)}`
      ]];

      autoTable(doc, {
        startY: 62,
        head: [tableHeaders],
        body: tableRows,
        foot: tableFoot,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235], // #2563eb
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [51, 65, 85]
        },
        footStyles: {
          fillColor: [239, 246, 255], // #eff6ff
          textColor: [30, 58, 138],
          fontStyle: 'bold',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 'auto', halign: 'center' },
          2: { cellWidth: 'auto', halign: 'center' },
          3: { cellWidth: 'auto', halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 25, halign: 'right' }
        },
        margin: { left: 15, right: 15 }
      });

      // Calculate final Y position of table to draw cards
      const finalY = (doc as any).lastAutoTable.finalY || 180;
      let cardsStartY = finalY + 12;

      // Check for overflow (A4 height is 297mm)
      if (cardsStartY > 260) {
        doc.addPage();
        cardsStartY = 20;
      }

      // Draw Purple Subtotal Cards
      const cardWidth = 56;
      const cardHeightHeader = 7;
      const cardHeightBody = 11;
      const gap = 6;
      const startX = 15;
      
      const cards = [
        { label: 'Subtotal Reservas', value: (venue.bookingsCount || 0).toString() },
        { label: 'Subtotal Ingresos', value: `S/ ${parseFloat(venue.totalIncome || 0).toFixed(2)}` },
        { label: 'Subtotal Comisiones', value: `S/ ${parseFloat(venue.totalCommissions || 0).toFixed(2)}` }
      ];

      cards.forEach((card, cardIndex) => {
        const x = startX + cardIndex * (cardWidth + gap);
        
        // Draw header rect
        doc.setFillColor(147, 51, 234); // #9333ea (Purple)
        doc.rect(x, cardsStartY, cardWidth, cardHeightHeader, 'F');
        
        // Draw body rect
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, cardsStartY + cardHeightHeader, cardWidth, cardHeightBody, 'FD');
        
        // Draw header text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(card.label, x + cardWidth / 2, cardsStartY + 4.8, { align: 'center' });
        
        // Draw body text
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.text(card.value, x + cardWidth / 2, cardsStartY + cardHeightHeader + 7.2, { align: 'center' });
      });
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`Reporte_Resumen_Salones_${dateStr}.pdf`);
  }

  generateExcel() {
    this.generatingExcel = true;
    const token = this.getToken();

    this.http.get<any[]>(`${environment.apiUrl}/venues/report/detailed`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        try {
          this.buildExcel(data);
        } catch (e) {
          console.error('Error rendering Excel:', e);
          alert('Error al dar formato al archivo Excel.');
        } finally {
          this.generatingExcel = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error fetching detailed report:', err);
        this.generatingExcel = false;
        this.cdr.detectChanges();
        alert('Ocurrió un error al generar el Excel del reporte. Inténtelo de nuevo.');
      }
    });
  }

  buildExcel(data: any[]) {
    let filteredData = [...data];
    
    // Filter by ubigeo if selected
    if (this.selectedDistrito) {
      filteredData = filteredData.filter(v => v.ubigeo === this.selectedDistrito);
    } else if (this.selectedProvincia) {
      filteredData = filteredData.filter(v => v.ubigeo && v.ubigeo.startsWith(this.selectedProvincia));
    } else if (this.selectedDepartamento) {
      filteredData = filteredData.filter(v => v.ubigeo && v.ubigeo.startsWith(this.selectedDepartamento));
    }

    if (filteredData.length === 0) {
      alert('No hay datos para exportar con los filtros de ubicación seleccionados.');
      return;
    }

    // Filter bookings within each venue by active date range
    const { start, end } = this.getCurrentDateRange(this.activeRange);

    const formatDateTime = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? dateStr : date.toLocaleString('es-PE', { hour12: true });
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    const globalLocationLabel = this.selectedLocationName
      ? this.selectedLocationName.toUpperCase()
      : 'TODAS LAS UBICACIONES';

    const rows: any[] = [];
    
    // Header & Filter Info
    rows.push(['REPORTE GLOBAL DE ESTADÍSTICAS Y RESERVAS']);
    rows.push(['Período:', this.dateRangeStr]);
    rows.push(['Filtro de Ubicación:', globalLocationLabel]);
    rows.push([]);

    // Table Header Row
    rows.push([
      'Propietario',
      'Correo Propietario',
      'Salón',
      'Ubicación del Salón',
      'Cliente',
      'F. Creación',
      'F. Reserva',
      'Horario',
      'Ingreso',
      'Comisión',
      'Ganancia'
    ]);

    let totalIncomeSum = 0;
    let totalCommissionsSum = 0;
    let totalEarningsSum = 0;
    let totalBookingsCount = 0;

    filteredData.forEach(venue => {
      const bookingsInRange = (venue.bookings || []).filter((b: any) => {
        const bDate = this.parseBookingDate(b);
        if (!bDate) return true;
        return bDate >= start && bDate <= end;
      });

      bookingsInRange.forEach((b: any) => {
        const income = parseFloat(b.totalAmount || 0);
        const commission = parseFloat(b.commission || 0);
        const earnings = parseFloat(b.earnings || 0);

        totalIncomeSum += income;
        totalCommissionsSum += commission;
        totalEarningsSum += earnings;
        totalBookingsCount++;

        rows.push([
          venue.ownerName || 'N/A',
          venue.ownerEmail || 'N/A',
          venue.venueName || 'N/A',
          venue.ubigeoText || 'N/A',
          b.clientName || 'N/A',
          formatDateTime(b.createdAt),
          formatDate(b.bookingDate),
          b.bookingHours || 'N/A',
          income,
          commission,
          earnings
        ]);
      });
    });

    // Spacer
    rows.push([]);

    // Totals Row
    rows.push([
      'TOTAL GENERAL',
      '',
      '',
      '',
      `${totalBookingsCount} reservas`,
      '',
      '',
      '',
      totalIncomeSum,
      totalCommissionsSum,
      totalEarningsSum
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Auto-fit columns
    const colWidths = [
      { wch: 22 }, // Propietario
      { wch: 28 }, // Correo Propietario
      { wch: 22 }, // Salón
      { wch: 28 }, // Ubicación del Salón
      { wch: 22 }, // Cliente
      { wch: 22 }, // F. Creación
      { wch: 14 }, // F. Reserva
      { wch: 16 }, // Horario
      { wch: 14 }, // Ingreso
      { wch: 14 }, // Comisión
      { wch: 14 }  // Ganancia
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas y Estadísticas');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Reporte_Resumen_Salones_${dateStr}.xlsx`);
  }
}
