import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, options?: { params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> }; headers?: HttpHeaders | { [header: string]: string | string[] } }): Observable<T> {
    return this.http.get<T>(this.url(path), options);
  }

  post<T>(path: string, body: any, options?: { headers?: HttpHeaders | { [header: string]: string | string[] } }): Observable<T> {
    return this.http.post<T>(this.url(path), body, options);
  }

  put<T>(path: string, body: any, options?: { headers?: HttpHeaders | { [header: string]: string | string[] } }): Observable<T> {
    return this.http.put<T>(this.url(path), body, options);
  }

  delete<T>(path: string, options?: { headers?: HttpHeaders | { [header: string]: string | string[] } }): Observable<T> {
    return this.http.delete<T>(this.url(path), options);
  }

  private url(path: string): string {
    if (!path) return this.baseUrl;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (!path.startsWith('/')) path = '/' + path;
    return this.baseUrl + path;
  }
}
