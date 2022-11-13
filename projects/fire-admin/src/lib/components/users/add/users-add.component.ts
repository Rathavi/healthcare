import { Component, OnInit } from '@angular/core';
import { getDefaultAvatar } from '../../../helpers/assets.helper';
import { UserRole } from '../../../models/collections/user.model';
import { UsersService } from '../../../services/collections/users.service';
import { AlertService } from '../../../services/alert.service';
import { I18nService } from '../../../services/i18n.service';
import { NavigationService } from '../../../services/navigation.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'fa-users-add',
  templateUrl: './users-add.component.html',
  styleUrls: ['./users-add.component.css']
})
export class UsersAddComponent implements OnInit {

  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  role: UserRole;
  allRoles: object|any = {};
  userRoleMap: any = {};
  bio: string;
  gender: string;
  weight: number;
  mobile: string;
  private avatar: File;
  avatarSrc: string|ArrayBuffer;
  mcode: string = '+1';
  mobileCodes: any[] = [];

  constructor(
    public users: UsersService,
    private alert: AlertService,
    private i18n: I18nService,
    private navigation: NavigationService,
    private route: ActivatedRoute,
  ) { 
    this.mobileCodes = this.users.getCountryCodes();
  }

  ngOnInit() {
    this.allRoles = this.users.getAllRoles();
    this.userRoleMap = UserRole;
    this.role = UserRole.Patient;
    this.avatar = null;
    this.avatarSrc = getDefaultAvatar();
    this.bio = null;
    this.gender = 'Male';
    this.mobile = '';
    this.weight = 0;
  }

  onAvatarChange(event: Event) {
    this.avatar = (event.target as HTMLInputElement).files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarSrc = reader.result;
    };
    reader.readAsDataURL(this.avatar);
  }

  addUser(event: Event, form: HTMLFormElement) {
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
      // Add user
      this.users.add({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        birthDate: this.birthDate ? new Date(this.birthDate).getTime() : null,
        role: this.role,
        weight: this.weight,
        mobile: this.mobile,
        mcode: this.mcode,
        bio: this.bio,
        gender: this.gender,
        avatar: this.avatar
      }).then(() => {
        this.alert.success(this.i18n.get('UserAdded'), false, 5000, true);
        this.navigation.redirectTo('users', 'list');
      }).catch((error: Error) => {
        this.alert.error(error.message);
      }).finally(() => {
        stopLoading();
      });
    }
  }

}
