import { Routes } from '@angular/router';
import { DatasetForm } from './datasets/dataset-form';

export const routes: Routes = [
  { path: '', redirectTo: 'datasets/new', pathMatch: 'full' },
  { path: 'datasets/new', component: DatasetForm },
  { path: 'datasets/:id/edit', component: DatasetForm },
];
