import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';


const routes: Routes = [
  {
    path: 'healthbase',
    //loadChildren: () => import('fire-admin').then(m => m.FireAdminModule)
    loadChildren: () => import('projects/fire-admin/src/public-api').then(m => m.FireAdminModule)
  },
  {
    path: '**',
    redirectTo: 'healthbase'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
