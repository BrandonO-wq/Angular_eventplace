import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCardModule} from '@angular/material/card';
import { inject } from '@angular/core';
import { AuthService } from '../../services/AuthService/auth.service';


@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCardModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  encapsulation: ViewEncapsulation.None
})
export class Login {
  private AuthService = inject(AuthService);
  private router = inject(Router);
  username = '';
  password = '';

clearForm(){
  this.username = '';
  this.password = '';
}

onLogin() {
    const credentials = {
      email: this.username,
      password: this.password
    };

this.AuthService.login(credentials).subscribe({
      next: (res) => {
        console.log('Login exitoso, tokens guardados', res);
        this.router.navigate(['/layout']); // Redirige al layout después del login exitoso
      },
      error: (err) => {
        console.error('Error en las credenciales', err);
      }
    });
  }
}