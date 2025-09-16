import { Routes } from '@angular/router';
import { DatasetForm } from './datasets/dataset-form';
import { DatasetEntries } from './datasets/dataset-entries';

export const routes: Routes = [
  { path: '', redirectTo: 'datasets/new', pathMatch: 'full' },
  { path: 'datasets/new', component: DatasetForm },
  { path: 'datasets/:id', component: DatasetEntries },
  { path: 'datasets/:id/edit', redirectTo: 'datasets/:id', pathMatch: 'full' },
];
