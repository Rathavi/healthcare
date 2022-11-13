import { Component, OnInit, AfterViewInit, Input } from '@angular/core';
import { NavigationService } from '../../../services/navigation.service';
import { initDropdown, toggleSidebar } from '../../../helpers/layout.helper';
import { getLogo } from '../../../helpers/assets.helper';
import { CurrentUserService } from '../../../services/current-user.service';
import { SidebarItem } from '../../../models/sidebar-item.model';

@Component({
  selector: 'fa-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, AfterViewInit {

  @Input() style: string = 'expanded';
  logo: string = getLogo();
  items: SidebarItem[] = [
    // Dashboard
    {
      label: 'Dashboard',
      icon: '&#xE917;',
      routerLink: this.navigation.getRouterLink('dashboard'),
      isHidden: () => !this.currentUser.isAdmin(),
    },
    {
      label: 'Profile',
      icon: '&#xE917;',
      isHidden: () => this.currentUser.isAdmin()
    },
    // Users
    {
      label: 'Users',
      icon: 'person',
      isActive: this.isActive(['users', 'list'], ['users', 'add'], ['users', 'edit'], ['users', 'profile']),
      isHidden: () => !this.currentUser.isAdmin(),
      childrens: [
        {
          label: 'List',
          routerLink: this.navigation.getRouterLink('users', 'list')
        },
        {
          label: 'Add',
          routerLink: this.navigation.getRouterLink('users', 'add')
        }
      ]
    },
    // Posts
    // {
    //   label: 'Posts',
    //   icon: 'description',
    //   isActive: this.isActive(['posts', 'list'], ['posts', 'add'], ['posts', 'edit'], ['posts', 'categories']),
    //   isHidden: () => !this.currentUser.isAdmin(),
    //   childrens: [
    //     {
    //       label: 'List',
    //       routerLink: this.navigation.getRouterLink('posts', 'list')
    //     },
    //     {
    //       label: 'Add',
    //       routerLink: this.navigation.getRouterLink('posts', 'add')
    //     },
    //     {
    //       label: 'Categories',
    //       routerLink: this.navigation.getRouterLink('posts', 'categories')
    //     },
    //     {
    //       label: 'Diagnosis',
    //       routerLink: this.navigation.getRouterLink('posts', 'diagnosis')
    //     }
    //   ]
    // }
  ];

  constructor(public navigation: NavigationService, private currentUser: CurrentUserService) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    initDropdown();
  }

  private isRouteActive(...path: string[]) {
    const link = this.navigation.getRouterLink(...path).join('/');
    //console.log(link);
    return this.navigation.router.isActive(link, false);
  }

  private isActive(...routes: any[]) {
    let isActive = false;
    routes.forEach((path: string[]) => {
      if (this.isRouteActive(...path)) {
        isActive = true;
      }
    });
    return isActive;
  }

  toggle() {
    toggleSidebar();
  }

}
