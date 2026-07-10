import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { environment } from '../../../Enviroments/Enviroment';

@Component({
  selector: 'app-crecimiento-plataforma',
  imports: [DecimalPipe],
  templateUrl: './crecimiento-plataforma.html',
  styleUrl: './crecimiento-plataforma.css',
})
export class CrecimientoPlataforma implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  totalSalones: number = 4;
  totalPropietarios: number = 1;

  maxValue: number = 10;
  
  gridLines = [
    { y: 10, value: 0 },
    { y: 48, value: 0 },
    { y: 86, value: 0 },
    { y: 124, value: 0 },
    { y: 162, value: 0 },
    { y: 200, value: 0 }
  ];
  
  salonesPoints: number[] = [];
  propietariosPoints: number[] = [];
  
  salonesPath: string = '';
  salonesArea: string = '';
  propietariosPath: string = '';
  propietariosArea: string = '';
  
  xCoords = [50, 160, 270, 380, 490, 600, 690];
  months = ['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];

  ngOnInit() {
    this.updateChart();

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
        this.updateChart();
      },
      error: (err) => {
        console.error('Error fetching platform stats:', err);
        // Retain default mock values so the chart still displays correctly
        this.updateChart();
      }
    });
  }

  updateChart() {
    let max = Math.max(this.totalSalones, this.totalPropietarios, 5);
    this.maxValue = Math.ceil(max / 5) * 5;
    
    this.gridLines = [
      { y: 10, value: this.maxValue },
      { y: 48, value: this.maxValue * 0.8 },
      { y: 86, value: this.maxValue * 0.6 },
      { y: 124, value: this.maxValue * 0.4 },
      { y: 162, value: this.maxValue * 0.2 },
      { y: 200, value: 0 }
    ];
    
    this.salonesPoints = this.generateGrowthCurve(this.totalSalones);
    this.propietariosPoints = this.generateGrowthCurve(this.totalPropietarios);
    
    this.salonesPath = this.generatePath(this.salonesPoints);
    this.salonesArea = this.generateArea(this.salonesPoints);
    
    this.propietariosPath = this.generatePath(this.propietariosPoints);
    this.propietariosArea = this.generateArea(this.propietariosPoints);
  }
  
  generateGrowthCurve(total: number): number[] {
    const points = [];
    for (let i = 0; i < 7; i++) {
       let val = total;
       if (i < 6) {
           const progress = i / 6;
           val = total * Math.pow(progress, 2); 
       }
       points.push(val);
    }
    return points;
  }
  
  generatePath(dataValues: number[]): string {
    if (dataValues.length === 0) return '';
    let d = '';
    dataValues.forEach((val, index) => {
      const x = this.xCoords[index];
      const y = this.getYCoord(val);
      d += index === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
    });
    return d;
  }
  
  generateArea(dataValues: number[]): string {
    if (dataValues.length === 0) return '';
    let d = this.generatePath(dataValues);
    d += ` L ${this.xCoords[6]} 200 L ${this.xCoords[0]} 200 Z`;
    return d;
  }
  
  getYCoord(val: number): number {
    return 200 - (val / this.maxValue) * 190;
  }
}
