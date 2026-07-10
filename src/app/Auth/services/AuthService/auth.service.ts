import { Injectable } from '@angular/core';
import { environment } from '../../../Enviroments/Enviroment';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthRequest } from '../../models/AuthRequest/auth-request';
import { AuthResponse } from '../../models/AuthResponse/auth-response';




@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  login(credentials: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/admin/login`, credentials, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    }).pipe(
      tap(response => {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
      })
    );
  }
}
