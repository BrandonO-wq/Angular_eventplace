import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarrasuperiorComponent } from '../../components/barrasuperior/barrasuperior.component/barrasuperior.component';
import { BarralateralComponent } from '../../components/barralateral/barralateral.component/barralateral.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    BarrasuperiorComponent,
    BarralateralComponent
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent {
  constructor() { }
}

