import {CommonModule} from '@angular/common';
import {Component, OnInit, input, output} from '@angular/core';
import {RouterModule} from '@angular/router';
import {Dataset} from '../models/dataset-model';
import {AlertType, UiEventsService} from '../services/ui-events.service';
import { MESSAGES, UI_TEXT} from '../services/message-service';
import {ApiService} from '../services/api.service';

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
  // Emits alerts to the parent (App)
  notify = output<{ type: AlertType; message: string }>();

  constructor(private readonly api: ApiService, private readonly ui: UiEventsService) {}

  ngOnInit(): void {
    this.loadDatasets();
    this.ui.sidebarRefresh$.subscribe(() => this.loadDatasets());
  }

  // Default item
  readonly defaultItem = {
    routeLink: '/datasets/new',
    icon: 'fal fa-plus',
    label: UI_TEXT.headers.createDataset,
  };

  items: { routeLink: string; icon: string; label: string }[] = [this.defaultItem];

  loadDatasets(): void {
    this.api.get<Dataset[]>('/datasets').subscribe({
      next: (datasets) => {
        // Map API datasets
        const datasetItems = datasets.map((dataset) => ({
          routeLink: `/datasets/${dataset.id}`,
          icon: 'fal fa-database',
          label: dataset.name,
        }));

        this.items = [this.defaultItem, ...datasetItems];
      },
      error: () => {
        this.notify.emit({ type: 'error', message: MESSAGES.loadDatasetError });
      },
    });
  }

  toggleCollapse(): void {
    this.changeIsSidebarCollapsed.emit(!this.isSidebarCollapsed);
  }

  closeSidenav(): void {
    this.changeIsSidebarCollapsed.emit(true);
  }

  protected readonly UI_TEXT = UI_TEXT;
}
