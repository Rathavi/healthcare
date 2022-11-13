import { Injectable } from "@angular/core";
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Injectable()
export class NavigationService {

  private rootPath: string = null;

  constructor(public router: Router, private location: Location) {
    this.rootPath = this.router.config[0].path;
  }

  back() {
    this.location.back()
  }

  private getQueryParams(path: string): Object {
    const queryParams = path.split('?')[1] || '';
    const params = queryParams.length ? queryParams.split('&') : [];
    let pair = null;
    let data = {};
    params.forEach((d) => {
      pair = d.split('=');
      data[`${pair[0]}`] = pair[1];
    });
    return data;
  }

  redirectTo(...path: string[]): void {
    //console.log(path, this.getQueryParams(path[0]));
    this.router.navigate(this.getRouterLink(...path), { queryParams: this.getQueryParams(path[0]) });
  }

  getRouterLink(...path: string[]): string[] {
    const root: any = this.rootPath ? '/' + this.rootPath : [];
    path = path.map((segment: string) => segment.split('?')[0]); // clean up / remove query params
    return [root, ...path];
  }

  setRootPath(path: string): void {
    this.rootPath = path;
  }

}
