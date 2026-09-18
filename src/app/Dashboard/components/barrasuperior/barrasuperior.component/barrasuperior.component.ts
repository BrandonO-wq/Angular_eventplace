import { Component, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../Enviroments/Enviroment';

@Component({
  selector: 'app-barrasuperior',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './barrasuperior.component.html',
  styleUrls: ['./barrasuperior.component.css'],
})
export class BarrasuperiorComponent implements OnInit {
  showCommissionModal = false;
  showOtpModal = false;
  commissionValue: number = 3;
  otpValue: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Cycle config variables
  showCycleModal = false;
  cycleConfig: any = null;
  loadingCycle = false;
  cycleErrorMessage = '';
  selectedStartDay: number = 1;
  selectedStartHour: number = 0;
  daysList = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  hoursList = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];

  // Cycle OTP config variables
  showCycleOtpModal = false;
  cycleOtpValue = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchCurrentCommission();
  }

  fetchCurrentCommission() {
    const token = this.getToken();
    if (!token) return;

    this.http.get<any>(`${environment.apiUrl}/host-debts/commission/percentage`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (res) => {
        let val = typeof res === 'object' && res !== null ? (res.percentage ?? res.value ?? res.newValue) : res;
        let parsedVal = parseFloat(val);
        if (!isNaN(parsedVal)) {
          if (parsedVal > 0 && parsedVal <= 1) {
            this.commissionValue = parsedVal * 100;
          } else {
            this.commissionValue = parsedVal;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching current commission percentage:', err);
        this.cdr.detectChanges();
      }
    });
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

  openCommissionModal() {
    this.showCommissionModal = true;
    this.fetchCurrentCommission();
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  closeCommissionModal() {
    if (!this.loading) {
      this.showCommissionModal = false;
      this.errorMessage = '';
      this.cdr.detectChanges();
    }
  }

  submitCommissionChange() {
    if (this.commissionValue === null || this.commissionValue < 0 || this.commissionValue > 100) {
      this.errorMessage = 'Ingresa un valor entre 0 y 100';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    const token = this.getToken();

    this.http.post(`${environment.apiUrl}/host-debts/commission/request-change`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: () => {
        this.loading = false;
        this.showCommissionModal = false;
        this.showOtpModal = true;
        this.otpValue = '';
        this.errorMessage = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error requesting commission change:', err);
        if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'No se pudo iniciar el proceso de cambio de comisión. Intente nuevamente.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  confirmOtp() {
    if (!this.otpValue) {
      this.errorMessage = 'Por favor, ingrese el código OTP.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
    const token = this.getToken();
    const decimalValue = (this.commissionValue || 0) / 100;

    this.http.post(`${environment.apiUrl}/host-debts/commission/confirm-change`, {
      otpCode: this.otpValue,
      newValue: decimalValue
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = '¡Configuración guardada con éxito!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.closeOtpModal();
          this.fetchCurrentCommission();
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error confirming commission change:', err);
        if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'El código OTP es incorrecto o ha expirado. Intente nuevamente.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  closeOtpModal() {
    if (!this.loading) {
      this.showOtpModal = false;
      this.errorMessage = '';
      this.successMessage = '';
      this.cdr.detectChanges();
    }
  }

  openCycleModal() {
    this.showCycleModal = true;
    this.cycleConfig = null;
    this.cycleErrorMessage = '';
    this.fetchCycleConfig();
    this.cdr.detectChanges();
  }

  closeCycleModal() {
    this.showCycleModal = false;
    this.cdr.detectChanges();
  }

  fetchCycleConfig() {
    const token = this.getToken();
    if (!token) return;

    this.loadingCycle = true;
    this.cycleErrorMessage = '';
    this.cdr.detectChanges();
    this.http.get<any>(`${environment.apiUrl}/host-debts/commission/cycle-config`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (res) => {
        this.loadingCycle = false;
        this.cycleConfig = res;
        this.selectedStartDay = res.startDayOfWeek || 1;
        this.selectedStartHour = res.startHour || 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingCycle = false;
        console.error('Error fetching cycle config:', err);
        this.cycleErrorMessage = err?.error?.message || 'No se pudo cargar la configuración del ciclo. Intente nuevamente.';
        this.cdr.detectChanges();
      }
    });
  }

  get calculatedEndDayName(): string {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const startIndex = Number(this.selectedStartDay) - 1; // 0-6
    const endIndex = (startIndex - 1 + 7) % 7;
    return days[endIndex];
  }

  get calculatedEndHourStr(): string {
    const hour = (Number(this.selectedStartHour) - 1 + 24) % 24;
    return String(hour).padStart(2, '0') + ':59:59';
  }

  get calculatedStartHourStr(): string {
    return String(this.selectedStartHour).padStart(2, '0') + ':00';
  }

  get calculatedDurationStr(): string {
    if (!this.cycleConfig) return '7 días (una semana)';
    const days = this.cycleConfig.cycleDays || 7;
    if (days === 7) return '7 días (una semana)';
    if (days === 14) return '14 días (dos semanas)';
    return `${days} días`;
  }

  submitCycleChange() {
    this.loadingCycle = true;
    this.cycleErrorMessage = '';
    this.cdr.detectChanges();
    const token = this.getToken();

    this.http.post(`${environment.apiUrl}/host-debts/commission/request-cycle-change`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: () => {
        this.loadingCycle = false;
        this.showCycleModal = false;
        this.showCycleOtpModal = true;
        this.cycleOtpValue = '';
        this.cycleErrorMessage = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingCycle = false;
        console.error('Error requesting cycle config change:', err);
        if (err?.error?.message) {
          this.cycleErrorMessage = err.error.message;
        } else {
          this.cycleErrorMessage = 'No se pudo iniciar el proceso de cambio de ciclo. Intente nuevamente.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  confirmCycleOtp() {
    if (!this.cycleOtpValue) {
      this.errorMessage = 'Por favor, ingrese el código OTP.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
    const token = this.getToken();

    const payload = {
      otpCode: this.cycleOtpValue,
      cycleDays: this.cycleConfig.cycleDays,
      deadlineOffsetDays: this.cycleConfig.deadlineOffsetDays,
      startDayOfWeek: Number(this.selectedStartDay),
      startHour: Number(this.selectedStartHour)
    };

    this.http.post(`${environment.apiUrl}/host-debts/commission/confirm-cycle-change`, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = '¡Configuración de ciclo guardada con éxito!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.closeCycleOtpModal();
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error confirming cycle config change:', err);
        if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'El código OTP es incorrecto o ha expirado. Intente nuevamente.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  closeCycleOtpModal() {
    if (!this.loading) {
      this.showCycleOtpModal = false;
      this.errorMessage = '';
      this.successMessage = '';
      this.cdr.detectChanges();
    }
  }
}
