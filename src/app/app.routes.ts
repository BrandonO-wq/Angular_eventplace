import { Routes } from '@angular/router';
import {Login} from './Auth/pages/login/login';
import { LayoutComponent } from './Dashboard/pages/layout.component/layout.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'layout', component: LayoutComponent }
];
