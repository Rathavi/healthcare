import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserRole, User } from '../../../models/collections/user.model';
import { Subscription } from 'rxjs';
import { UsersService } from '../../../services/collections/users.service';
import { I18nService } from '../../../services/i18n.service';
import { AlertService } from '../../../services/alert.service';
import { ActivatedRoute } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { NavigationService } from '../../../services/navigation.service';

@Component({
  selector: 'fa-users-edit',
  templateUrl: './users-edit.component.html',
  styleUrls: ['./users-edit.component.css']
})
export class UsersEditComponent implements OnInit, OnDestroy {

  id: string;
  profileUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  role: UserRole;
  allRoles: object|any = {};
  userRoleMap: object|any = {};
  bio: string;
  gender: string;
  mobile: string;
  weight: number;
  private avatar: File;
  avatarSrc: string|ArrayBuffer;
  private subscription: Subscription = new Subscription();
  userData: User; // used to keep track of old user data
  mcode: string = '+1';
  mobileCodes: any[] = [];

  constructor(
    public users: UsersService,
    private i18n: I18nService,
    private alert: AlertService,
    private route: ActivatedRoute,
    public navigation: NavigationService
  ) { 
    this.mobileCodes = this.users.getCountryCodes();
  }

  ngOnInit() {
    this.profileUrl = window.location.origin;
    this.allRoles = this.users.getAllRoles();
    this.userRoleMap = UserRole;
    this.subscription.add(
      this.route.params.subscribe((params: { id: string }) => {
        this.users.get(params.id).pipe(take(1)).toPromise().then((user: User) => {
          if (user) {
            this.userData = user;
            this.id = params.id;
            this.firstName = user.firstName;
            this.lastName = user.lastName;
            this.email = user.email;
            this.password = user.password;
            this.birthDate = user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : null;
            this.role = user.role;
            this.bio = user.bio;
            this.gender = user.gender || 'Male';
            this.mobile = user.mobile;
            this.mcode = user.mcode || '+1';
            this.weight = user.weight;
            this.avatar = null;
            this.subscription.add(
              this.users.getAvatarUrl(user.avatar as string).subscribe((imageUrl: string) => {
                this.avatarSrc = imageUrl;
              })
            );
          } else {
            this.navigation.redirectTo('users', 'list');
          }
        });
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  onAvatarChange(event: Event) {
    this.avatar = (event.target as HTMLInputElement).files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarSrc = reader.result;
    };
    reader.readAsDataURL(this.avatar);
  }

  updateUser(event: Event, form: HTMLFormElement) {
    form.isSubmitted = true;
    if (form.checkValidity() && this.users.validE164(this.mcode + this.mobile)) {
      const target = event.target as any;
      const startLoading = () => {
        target.isDisabled = true;
        target.isLoading = true;
      };
      const stopLoading = () => {
        target.isDisabled = false;
        target.isLoading = false;
      };
      startLoading();
      // Edit user
      const data: User = {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        birthDate: this.birthDate ? new Date(this.birthDate).getTime() : null,
        role: this.role,
        bio: this.bio,
        gender: this.gender,
        mobile: this.mobile,
        mcode: this.mcode,
        weight: this.weight || 0
      };
      if (this.avatar) {
        data.avatar = this.avatar;
      }
      this.users.edit(this.id, data, {
        email: this.userData.email,
        password: this.userData.password,
        mobile: this.userData.mobile,
        mcode: this.userData.mcode
      }).then(() => {
        this.userData = {...this.userData, ...data}; // override old user data
        this.alert.success(this.i18n.get('UserUpdated'), false, 5000);
      }).catch((error: Error) => {
        this.alert.error(error.message);
      }).finally(() => {
        stopLoading();
      });
    }
  }

}
