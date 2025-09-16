import { CommonModule } from '@angular/common';
import {Component, input, OnInit, output} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Dataset } from '../models/dataset-model';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  isSidebarCollapsed = input.required<boolean>();
  changeIsSidebarCollapsed = output<boolean>();

  items: { routeLink: string; icon: string; label: string }[] = [];

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadDatasets();
  }

  loadDatasets(): void {
    this.http.get<Dataset[]>('http://localhost:8080/datasets').subscribe({
      next: (datasets) => {
        // Default item
        const defaultItem = {
          routeLink: '/datasets/new',
          icon: 'fal fa-star',
          label: 'Add Dataset',
        };

        // Map API datasets
        const datasetItems = datasets.map((dataset) => ({
          routeLink: `/datasets/${dataset.id}/`,
          icon: 'fal fa-database',
          label: dataset.name,
        }));

        // Combine default + loaded items
        this.items = [defaultItem, ...datasetItems];
      },
      error: (err) => {
        console.error('Failed to load datasets', err);
      },
    });
  }

  toggleCollapse(): void {
    this.changeIsSidebarCollapsed.emit(!this.isSidebarCollapsed);
  }

  closeSidenav(): void {
    this.changeIsSidebarCollapsed.emit(true);
  }
}
