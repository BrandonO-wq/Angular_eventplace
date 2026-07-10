import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../Enviroments/Enviroment';

@Component({
  selector: 'app-dashboard-stats',
  imports: [],
  templateUrl: './dashboard-stats.html',
  styleUrl: './dashboard-stats.css',
})
export class DashboardStats implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  totalSalones: number = 4;
  totalPropietarios: number = 1;

  ngOnInit() {
    this.http.get<any>(`${this.apiUrl}/venues/report/stats`, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    }).subscribe({
      next: (data) => {
        if (data && typeof data.totalSalones === 'number') {
          this.totalSalones = data.totalSalones;
        }
        if (data && typeof data.totalPropietarios === 'number') {
          this.totalPropietarios = data.totalPropietarios;
        }
      },
      error: (err) => {
        console.error('Error fetching dashboard stats:', err);
      }
    });
  }
}
