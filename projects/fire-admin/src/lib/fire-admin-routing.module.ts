import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FireAdminComponent } from './fire-admin.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';
import { PostsListComponent } from './components/posts/list/posts-list.component';
import { PostsAddComponent } from './components/posts/add/posts-add.component';
import { PostsEditComponent } from './components/posts/edit/posts-edit.component';
import { PostsCategoriesComponent } from './components/posts/categories/posts-categories.component';
import { SettingsComponent } from './components/settings/settings.component';
import { UsersListComponent } from './components/users/list/users-list.component';
import { UsersAddComponent } from './components/users/add/users-add.component';
import { UsersProfileComponent } from './components/users/profile/users-profile.component';
import { UsersEditComponent } from './components/users/edit/users-edit.component';
import { TranslationsComponent } from './components/translations/translations.component';
import { UserGuard } from './guards/user.guard';
import { RegisterComponent } from './components/register/register.component';
import { RegisterGuard } from './guards/register.guard';
import { LogoutComponent } from './components/logout/logout.component';

const routes: Routes = [
  {
    path: '',
    component: FireAdminComponent,
    children: [
      // Login
      {
        path: 'login',
        component: LoginComponent,
        canActivate: [LoginGuard]
      },
      // Logout
      {
        path: 'logout',
        component: LogoutComponent
      },
      // Register
      {
        path: 'register',
        component: RegisterComponent,
        canActivate: [RegisterGuard]
      },
      // Dashboard
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard]
      },
      // Settings
      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [AuthGuard]
      },
      // Posts
      {
        path: 'posts',
        canActivate: [AuthGuard],
        children: [
          {
            path: 'list',
            component: PostsListComponent
          },
          {
            path: 'list/status/:status',
            component: PostsListComponent
          },
          {
            path: 'list/category/:categoryId',
            component: PostsListComponent
          },
          {
            path: 'list/author/:authorId',
            component: PostsListComponent
          },
          {
            path: 'list/patient/:patientId',
            component: PostsListComponent
          },
          {
            path: 'add/:patient',
            component: PostsAddComponent
          },
          {
            path: 'add',
            component: PostsAddComponent
          },
          {
            path: 'edit/:id',
            component: PostsEditComponent
          },
          {
            path: 'categories',
            component: PostsCategoriesComponent
          },
          {
            path: 'diagnosis',
            component: PostsCategoriesComponent
          },
          {
            path: '**',
            redirectTo: 'list'
          }
        ]
      },
      // Users
      {
        path: 'users',
        canActivate: [AuthGuard],
        children: [
          {
            path: 'list',
            component: UsersListComponent,
            canActivate: [UserGuard]
          },
          {
            path: 'list/role/:role',
            component: UsersListComponent,
            canActivate: [UserGuard]
          },
          {
            path: 'add',
            component: UsersAddComponent,
            canActivate: [UserGuard]
          },
          {
            path: 'edit/:id',
            component: UsersEditComponent,
            canActivate: [UserGuard]
          },
          {
            path: 'profile/:id',
            component: UsersProfileComponent,
            canActivate: [UserGuard]
          },
          {
            path: '**',
            redirectTo: 'list'
          }
        ]
      },
      // Translations
      {
        path: 'translations',
        component: TranslationsComponent,
        canActivate: [AuthGuard]
      },
      // 404
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FireAdminRoutingModule { }
