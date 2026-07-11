import { Routes } from '@angular/router';
import { Login } from './Auth/pages/login/login';
import { LayoutComponent } from './Dashboard/pages/layout.component/layout.component';
import { DashboardComponent } from './Dashboard/pages/dashboard/dashboard.component';
import { PropietariosComponent } from './propietarios/propietarios.component';
import { SalonesComponent } from './salones/salones.component';
import { authGuard } from './Auth/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'layout', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'propietarios', component: PropietariosComponent },
      { path: 'salones', component: SalonesComponent }
    ]
  },
  { path: '**', redirectTo: '/login' }
];

