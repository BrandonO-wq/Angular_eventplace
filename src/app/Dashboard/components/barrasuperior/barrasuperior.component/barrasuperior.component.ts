import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
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

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
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
      },
      error: (err) => {
        console.error('Error fetching current commission percentage:', err);
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
  }

  closeCommissionModal() {
    if (!this.loading) {
      this.showCommissionModal = false;
      this.errorMessage = '';
    }
  }

  submitCommissionChange() {
    if (this.commissionValue === null || this.commissionValue < 0 || this.commissionValue > 100) {
      this.errorMessage = 'Ingresa un valor entre 0 y 100';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
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
      },
      error: (err) => {
        this.loading = false;
        console.error('Error requesting commission change:', err);
        if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'No se pudo iniciar el proceso de cambio de comisión. Intente nuevamente.';
        }
      }
    });
  }

  confirmOtp() {
    if (!this.otpValue) {
      this.errorMessage = 'Por favor, ingrese el código OTP.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
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
        setTimeout(() => {
          this.closeOtpModal();
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
      }
    });
  }

  closeOtpModal() {
    if (!this.loading) {
      this.showOtpModal = false;
      this.errorMessage = '';
      this.successMessage = '';
    }
  }
}
