import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-barrasuperior',
  standalone: true,
  imports: [RouterLink, RouterLinkActive], // Puedes agregar otros módulos aquí si los necesitas
  templateUrl: './barrasuperior.component.html',
  styleUrls: ['./barrasuperior.component.css'],
})
export class BarrasuperiorComponent {

}
