import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarrasuperiorComponent } from './barrasuperior.component';
import { BarralateralComponent } from '../../barralateral/barralateral.component/barralateral.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    BarrasuperiorComponent,
    BarralateralComponent
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {

}