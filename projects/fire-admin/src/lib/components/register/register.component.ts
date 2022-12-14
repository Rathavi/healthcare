import { Component, OnInit } from '@angular/core';
import { getLogo } from '../../helpers/assets.helper';
import { NavigationService } from '../../services/navigation.service';
import { UsersService } from '../../services/collections/users.service';
import { UserRole } from '../../models/collections/user.model';

@Component({
  selector: 'fa-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  logo: string = getLogo();
  email: string = '';
  password: string = '';
  fname: string = '';
  lname: string = '';
  speciality: string = '';
  hospital: string = '';
  experience: string = '';
  mobile: string = '';
  mcode: string = '+1';
  mobileCodes: any[] = [];
  passwordConfirmation: string = '';
  error: string = null;

  constructor(public navigation: NavigationService, public users: UsersService) {
    this.mobileCodes = this.users.getCountryCodes()
  }

  ngOnInit() {
  }

  onSubmit(event: Event, submitButton: HTMLButtonElement|any) {
    const form = event.target as any;
    form.isSubmitted = true;
    if (form.checkValidity() && this.password === this.passwordConfirmation && this.users.validE164(this.mcode + this.mobile)) {
      const startLoading = () => {
        submitButton.isDisabled = true;
        submitButton.isLoading = true;
      };
      const stopLoading = () => {
        submitButton.isDisabled = false;
        submitButton.isLoading = false;
      };
      startLoading();
      // Register admin
      this.users.register({
        firstName: this.fname,
        lastName: this.lname,
        email: this.email,
        password: this.password,
        hospital: this.hospital,
        speciality: this.speciality,
        experience: this.experience,
        role: UserRole.Doctor,
        weight: 70,
        birthDate: null,
        bio: null,
        mobile: this.mobile,
        mcode: this.mcode,
        gender: 'Male'
      }).then(() => {
        this.navigation.redirectTo(`login`);
      }).catch((error: Error) => {
        this.error = error.message;
      }).finally(() => {
        stopLoading();
      });
    }
  }

  dismissError(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.error = null;
  }

}
