import { Injectable } from '@angular/core';
import { DatabaseService } from '../database.service';
import { now, isFile, guid } from '../../helpers/functions.helper';
import { User, UserRole } from '../../models/collections/user.model';
import { StorageService } from '../storage.service';
import { FirebaseUserService } from '../firebase-user.service';
import { getDefaultAvatar, getLoadingImage } from '../../helpers/assets.helper';
import { of, merge, Observable} from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import { QueryFn } from '@angular/fire/firestore';
import { ResolveEnd } from '@angular/router';

@Injectable()
export class UsersService {

  private allRoles: object = {};
  private userRoleMap: object = {};
  private imagesCache: object = {};
  private fullNameCache: object = {};

  constructor(
    private db: DatabaseService,
    private storage: StorageService,
    private firebaseUser: FirebaseUserService
  ) {
    Object.keys(UserRole).forEach((key: string) => {
      this.allRoles[UserRole[key]] = key;
    });
  }

  getAllRoles() {
    return this.allRoles;
  }

  add(data: User) {
    const user: User = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      birthDate: data.birthDate,
      role: data.role,
      bio: data.bio,
      gender: data.gender,
      weight: data.weight,
      mobile: data.mobile,
      mcode: data.mcode,
      avatar: null,
      createdAt: now(), // timestamp
      updatedAt: null,
      createdBy: this.db.currentUser.id,
      updatedBy: null
    };
    return new Promise((resolve, reject) => {
      let uid = data.mcode + data.mobile;
      this.isMobileUsed(data, (u: User) => {
        if(u) {
          reject(new Error('Mobile already used'))
          return;
        }
        this.uploadImageAfter(this.db.addDocument('users', user, uid), user, data).then(() => {
          resolve();
        }).catch((error: Error) => {
          reject(error);
        });
      });
    });
  }

  register(data: User) {
    const user: User = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password, // ToDo: add encryption for password (do not use hashing, since we need plain password on update/delete @see FirebaseUserService)
      birthDate: data.birthDate,
      role: data.role,
      bio: data.bio,
      gender: data.gender,
      weight: data.weight,
      mobile: data.mobile,
      mcode: data.mcode,
      avatar: null,
      createdAt: now(), // timestamp
      updatedAt: null,
      createdBy: null,
      updatedBy: null
    };
    return new Promise((resolve, reject) => {
      this.firebaseUser.register(user).then(() => {
        resolve();
      }).catch((error: Error) => {
        reject(error);
      });
    });
  }

  private isMobileUsed(data: User, callback) {
    if(data.role === UserRole.Doctor) {
      callback();
      return;
    }
    let obs = this.getWhereFn(ref => {
      let query : any = ref;
      query = query.where('mobile', '==', data.mobile);
      query = query.where('mcode', '==', data.mcode);
      return query;
    }, true)
    .pipe(map((users: User[]) => {
      console.log(users);
      return users[0]
    }));
    let sub = obs.subscribe((user: User) => {
      callback(user);
      sub.unsubscribe();
    });
    // this.get(mobile).pipe(take(1)).toPromise().then((user: User) => {
    //   callback(user);
    // });
  }

  private uploadImageAfter(promise: Promise<any>, user: User, data: User) {
    return new Promise((resolve, reject) => {
      promise.then((doc: any) => {
        if (data.avatar && isFile(data.avatar)) {
          const id = doc ? doc.id : data.id;
          const imageFile = (data.avatar as File);
          const imageName = guid() + '.' + imageFile.name.split('.').pop();
          const imagePath = `users/${id}/${imageName}`;
          this.storage.upload(imagePath, imageFile).then(() => {
            user.avatar = imagePath;
            const savePromise: Promise<any> = doc ? doc.set(user) : this.db.setDocument('users', id, user);
            savePromise.finally(() => {
              resolve();
            });
          }).catch((error: Error) => {
            reject(error);
          });
        } else {
          resolve();
        }
      }).catch((error: Error) => {
        reject(error);
      });
    });
  }

  get(id: string) {
    return this.db.getDocument('users', id).pipe(map((user: User) => {
      if(user) {
        user.id = id;
      }
      return user;
    }));
  }

  getFullName(id: string) {
    if (this.fullNameCache[id]) {
      return of(this.fullNameCache[id]);
    } else {
      return this.get(id).pipe(map((user: User) => {
        const fullName = `${user.firstName} ${user.lastName}`;
        this.fullNameCache[id] = fullName;
        return fullName;
      }));
    }
  }

  getAll() {
    return this.db.getCollection('users');
  }

  getWhere(field: string, operator: firebase.firestore.WhereFilterOp, value: string, allowPipe: boolean = false) {
    return this.getWhereFn(ref => ref.where(field, operator, value), allowPipe);
  }

  getWhereFn(queryFn: QueryFn,  applyPipe: boolean = false) {
    let postsObservable = this.db.getCollection('users', queryFn);
    return applyPipe ? this.pipeUsers(postsObservable) : postsObservable;
  }

  private pipeUsers(postsObservable: Observable<User[]>) {
    return postsObservable.pipe(mergeMap(async (users: User[]) => {
      return users;
    }));
  }

  getAvatarUrl(imagePath: string) {
    if (imagePath) {
      if (this.imagesCache[imagePath]) {
        return of(this.imagesCache[imagePath]);
      } else {
        return merge(of(getLoadingImage()), this.storage.get(imagePath).getDownloadURL().pipe(map((imageUrl: string) => {
          this.imagesCache[imagePath] = imageUrl;
          return imageUrl;
        })));
      }
    } else {
      return of(getDefaultAvatar());
    }
  }

  private updateEmail(email: string, password: string, newEmail: string) {
    return new Promise((resolve, reject) => {
      if (newEmail !== email) {
        this.firebaseUser.updateEmail(email, password, newEmail).then(() => {
          resolve();
        }).catch((error: Error) => {
          reject(error);
        });
      } else {
        resolve();
      }
    });
  }

  private updatePassword(email: string, password: string, newPassword: string) {
    return new Promise((resolve, reject) => {
      if (newPassword !== password) {
        this.firebaseUser.updatePassword(email, password, newPassword).then(() => {
          resolve();
        }).catch((error: Error) => {
          reject(error);
        });
      } else {
        resolve();
      }
    });
  }

  validE164(num) {
    return /^(?!(\d)\1+$)(?:\(?\+\d{1,3}\)?[- ]?|0)?\d{10}$/.test(num);
  }

  edit(id: string, data: User, oldData: { email: string, password: string, mobile: string, mcode: string }) {
    const user: User = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      birthDate: data.birthDate,
      role: data.role,
      bio: data.bio,
      gender: data.gender,
      weight: data.weight,
      mobile: data.mobile,
      mcode: data.mcode,
      updatedAt: now(),
      updatedBy: this.db.currentUser.id
    };
    if (/*data.avatar !== undefined && */data.avatar === null) {
      user.avatar = null;
    }
    return new Promise((resolve, reject) => {
      let newMobile = data.mcode + data.mobile;
      this.isMobileUsed(data, (u: User) => {
        let oldMobile = oldData.mcode + oldData.mobile;
        if(u && newMobile != oldMobile) {
          reject(new Error('Mobile already used'))
          return;
        }
        if(data.role === UserRole.Patient) {
          this.uploadImageAfter(this.db.setDocument('users', id, user), user, {...data, id: id}).then(() => {
            resolve();
          }).catch((error: Error) => {
            reject(error);
          });
          return;
        }
        this.updateEmail(oldData.email, oldData.password, data.email).then(() => {
          this.updatePassword(data.email, oldData.password, data.password).then(() => {
            this.uploadImageAfter(this.db.setDocument('users', id, user), user, {...data, id: id}).then(() => {
              resolve();
            }).catch((error: Error) => {
              reject(error);
            });
          }).catch((error: Error) => {
            reject(error);
          });
        }).catch((error: Error) => {
          reject(error);
        });
      });
    });
  }

  private deleteImage(imagePath: string) {
    return new Promise((resolve, reject) => {
      if (imagePath) {
        this.storage.delete(imagePath).toPromise().then(() => {
          resolve();
        }).catch((error: Error) => {
          reject(error);
        });
      } else {
        resolve();
      }
    });
  }

  delete(id: string, data: { email: string, password: string, avatar: string }) {
    return new Promise((resolve, reject) => {
      this.firebaseUser.delete(data.email, data.password).then(() => {
        this.db.deleteDocument('users', id).then(() => {
          this.deleteImage(data.avatar).then(() => {
            resolve();
          }).catch((error: Error) => {
            reject(error);
          });
        }).catch((error: Error) => {
          reject(error);
        });
      }).catch((error: Error) => {
        reject(error);
      });
    });
  }

  countAll() {
    return this.db.getDocumentsCount('users');
  }

  countWhereFn(queryFn: QueryFn) {
    return this.db.getDocumentsCount('users', queryFn);
  }

  countWhere(field: string, operator: firebase.firestore.WhereFilterOp, value: string) {
    return this.countWhereFn(ref => ref.where(field, operator, value));
  }

  countryMobileCodes = [
    {
      "code": "+1",
      "name": "United States"
    },
    {
      "code": "+91",
      "name": "India"
    },
    {
      "code": "+93",
      "name": "Afghanistan"
    },
    {
      "code": "+355",
      "name": "Albania"
    },
    {
      "code": "+213",
      "name": "Algeria"
    },
    {
      "code": "+376",
      "name": "Andorra"
    },
    {
      "code": "+244",
      "name": "Angola"
    },
    {
      "code": "+54",
      "name": "Argentina"
    },
    {
      "code": "+374",
      "name": "Armenia"
    },
    {
      "code": "+297",
      "name": "Aruba"
    },
    {
      "code": "+247",
      "name": "Ascension"
    },
    {
      "code": "+61",
      "name": "Australia"
    },
    {
      "code": "+672",
      "name": "Australian External Territories"
    },
    {
      "code": "+43",
      "name": "Austria"
    },
    {
      "code": "+994",
      "name": "Azerbaijan"
    },
    {
      "code": "+973",
      "name": "Bahrain"
    },
    {
      "code": "+880",
      "name": "Bangladesh"
    },
    {
      "code": "+375",
      "name": "Belarus"
    },
    {
      "code": "+32",
      "name": "Belgium"
    },
    {
      "code": "+501",
      "name": "Belize"
    },
    {
      "code": "+229",
      "name": "Benin"
    },
    {
      "code": "+975",
      "name": "Bhutan"
    },
    {
      "code": "+591",
      "name": "Bolivia"
    },
    {
      "code": "+387",
      "name": "Bosnia and Herzegovina"
    },
    {
      "code": "+267",
      "name": "Botswana"
    },
    {
      "code": "+55",
      "name": "Brazil"
    },
    {
      "code": "+673",
      "name": "Brunei"
    },
    {
      "code": "+359",
      "name": "Bulgaria"
    },
    {
      "code": "+226",
      "name": "Burkina Faso"
    },
    {
      "code": "+257",
      "name": "Burundi"
    },
    {
      "code": "+855",
      "name": "Cambodia"
    },
    {
      "code": "+237",
      "name": "Cameroon"
    },
    {
      "code": "+238",
      "name": "Cape Verde"
    },
    {
      "code": "+236",
      "name": "Central African Republic"
    },
    {
      "code": "+235",
      "name": "Chad"
    },
    {
      "code": "+56",
      "name": "Chile"
    },
    {
      "code": "+86",
      "name": "China"
    },
    {
      "code": "+61",
      "name": "Christmas Island"
    },
    {
      "code": "+61",
      "name": "Cocos-Keeling Islands"
    },
    {
      "code": "+57",
      "name": "Colombia"
    },
    {
      "code": "+269",
      "name": "Comoros"
    },
    {
      "code": "+242",
      "name": "Congo"
    },
    {
      "code": "+243",
      "name": "Congo, Dem. Rep. of (Zaire)"
    },
    {
      "code": "+682",
      "name": "Cook Islands"
    },
    {
      "code": "+506",
      "name": "Costa Rica"
    },
    {
      "code": "+385",
      "name": "Croatia"
    },
    {
      "code": "+53",
      "name": "Cuba"
    },
    {
      "code": "+599",
      "name": "Curacao"
    },
    {
      "code": "+537",
      "name": "Cyprus"
    },
    {
      "code": "+420",
      "name": "Czech Republic"
    },
    {
      "code": "+45",
      "name": "Denmark"
    },
    {
      "code": "+246",
      "name": "Diego Garcia"
    },
    {
      "code": "+253",
      "name": "Djibouti"
    },
    {
      "code": "+670",
      "name": "East Timor"
    },
    {
      "code": "+56",
      "name": "Easter Island"
    },
    {
      "code": "+593",
      "name": "Ecuador"
    },
    {
      "code": "+20",
      "name": "Egypt"
    },
    {
      "code": "+503",
      "name": "El Salvador"
    },
    {
      "code": "+240",
      "name": "Equatorial Guinea"
    },
    {
      "code": "+291",
      "name": "Eritrea"
    },
    {
      "code": "+372",
      "name": "Estonia"
    },
    {
      "code": "+251",
      "name": "Ethiopia"
    },
    {
      "code": "+500",
      "name": "Falkland Islands"
    },
    {
      "code": "+298",
      "name": "Faroe Islands"
    },
    {
      "code": "+679",
      "name": "Fiji"
    },
    {
      "code": "+358",
      "name": "Finland"
    },
    {
      "code": "+33",
      "name": "France"
    },
    {
      "code": "+596",
      "name": "French Antilles"
    },
    {
      "code": "+594",
      "name": "French Guiana"
    },
    {
      "code": "+689",
      "name": "French Polynesia"
    },
    {
      "code": "+241",
      "name": "Gabon"
    },
    {
      "code": "+220",
      "name": "Gambia"
    },
    {
      "code": "+995",
      "name": "Georgia"
    },
    {
      "code": "+49",
      "name": "Germany"
    },
    {
      "code": "+233",
      "name": "Ghana"
    },
    {
      "code": "+350",
      "name": "Gibraltar"
    },
    {
      "code": "+30",
      "name": "Greece"
    },
    {
      "code": "+299",
      "name": "Greenland"
    },
    {
      "code": "+590",
      "name": "Guadeloupe"
    },
    {
      "code": "+502",
      "name": "Guatemala"
    },
    {
      "code": "+224",
      "name": "Guinea"
    },
    {
      "code": "+245",
      "name": "Guinea-Bissau"
    },
    {
      "code": "+595",
      "name": "Guyana"
    },
    {
      "code": "+509",
      "name": "Haiti"
    },
    {
      "code": "+504",
      "name": "Honduras"
    },
    {
      "code": "+852",
      "name": "Hong Kong SAR China"
    },
    {
      "code": "+36",
      "name": "Hungary"
    },
    {
      "code": "+354",
      "name": "Iceland"
    },
    {
      "code": "+62",
      "name": "Indonesia"
    },
    {
      "code": "+98",
      "name": "Iran"
    },
    {
      "code": "+964",
      "name": "Iraq"
    },
    {
      "code": "+353",
      "name": "Ireland"
    },
    {
      "code": "+972",
      "name": "Israel"
    },
    {
      "code": "+39",
      "name": "Italy"
    },
    {
      "code": "+225",
      "name": "Ivory Coast"
    },
    {
      "code": "+81",
      "name": "Japan"
    },
    {
      "code": "+962",
      "name": "Jordan"
    },
    {
      "code": "+254",
      "name": "Kenya"
    },
    {
      "code": "+686",
      "name": "Kiribati"
    },
    {
      "code": "+965",
      "name": "Kuwait"
    },
    {
      "code": "+996",
      "name": "Kyrgyzstan"
    },
    {
      "code": "+856",
      "name": "Laos"
    },
    {
      "code": "+371",
      "name": "Latvia"
    },
    {
      "code": "+961",
      "name": "Lebanon"
    },
    {
      "code": "+266",
      "name": "Lesotho"
    },
    {
      "code": "+231",
      "name": "Liberia"
    },
    {
      "code": "+218",
      "name": "Libya"
    },
    {
      "code": "+423",
      "name": "Liechtenstein"
    },
    {
      "code": "+370",
      "name": "Lithuania"
    },
    {
      "code": "+352",
      "name": "Luxembourg"
    },
    {
      "code": "+853",
      "name": "Macau SAR China"
    },
    {
      "code": "+389",
      "name": "Macedonia"
    },
    {
      "code": "+261",
      "name": "Madagascar"
    },
    {
      "code": "+265",
      "name": "Malawi"
    },
    {
      "code": "+60",
      "name": "Malaysia"
    },
    {
      "code": "+960",
      "name": "Maldives"
    },
    {
      "code": "+223",
      "name": "Mali"
    },
    {
      "code": "+356",
      "name": "Malta"
    },
    {
      "code": "+692",
      "name": "Marshall Islands"
    },
    {
      "code": "+596",
      "name": "Martinique"
    },
    {
      "code": "+222",
      "name": "Mauritania"
    },
    {
      "code": "+230",
      "name": "Mauritius"
    },
    {
      "code": "+262",
      "name": "Mayotte"
    },
    {
      "code": "+52",
      "name": "Mexico"
    },
    {
      "code": "+691",
      "name": "Micronesia"
    },
    {
      "code": "+373",
      "name": "Moldova"
    },
    {
      "code": "+377",
      "name": "Monaco"
    },
    {
      "code": "+976",
      "name": "Mongolia"
    },
    {
      "code": "+382",
      "name": "Montenegro"
    },
    {
      "code": "+1664",
      "name": "Montserrat"
    },
    {
      "code": "+212",
      "name": "Morocco"
    },
    {
      "code": "+95",
      "name": "Myanmar"
    },
    {
      "code": "+264",
      "name": "Namibia"
    },
    {
      "code": "+674",
      "name": "Nauru"
    },
    {
      "code": "+977",
      "name": "Nepal"
    },
    {
      "code": "+31",
      "name": "Netherlands"
    },
    {
      "code": "+599",
      "name": "Netherlands Antilles"
    },
    {
      "code": "+687",
      "name": "New Caledonia"
    },
    {
      "code": "+64",
      "name": "New Zealand"
    },
    {
      "code": "+505",
      "name": "Nicaragua"
    },
    {
      "code": "+227",
      "name": "Niger"
    },
    {
      "code": "+234",
      "name": "Nigeria"
    },
    {
      "code": "+683",
      "name": "Niue"
    },
    {
      "code": "+672",
      "name": "Norfolk Island"
    },
    {
      "code": "+850",
      "name": "North Korea"
    },
    {
      "code": "+47",
      "name": "Norway"
    },
    {
      "code": "+968",
      "name": "Oman"
    },
    {
      "code": "+92",
      "name": "Pakistan"
    },
    {
      "code": "+680",
      "name": "Palau"
    },
    {
      "code": "+970",
      "name": "Palestinian Territory"
    },
    {
      "code": "+507",
      "name": "Panama"
    },
    {
      "code": "+675",
      "name": "Papua New Guinea"
    },
    {
      "code": "+595",
      "name": "Paraguay"
    },
    {
      "code": "+51",
      "name": "Peru"
    },
    {
      "code": "+63",
      "name": "Philippines"
    },
    {
      "code": "+48",
      "name": "Poland"
    },
    {
      "code": "+351",
      "name": "Portugal"
    },
    {
      "code": "+974",
      "name": "Qatar"
    },
    {
      "code": "+262",
      "name": "Reunion"
    },
    {
      "code": "+40",
      "name": "Romania"
    },
    {
      "code": "+7",
      "name": "Russia"
    },
    {
      "code": "+250",
      "name": "Rwanda"
    },
    {
      "code": "+685",
      "name": "Samoa"
    },
    {
      "code": "+378",
      "name": "San Marino"
    },
    {
      "code": "+966",
      "name": "Saudi Arabia"
    },
    {
      "code": "+221",
      "name": "Senegal"
    },
    {
      "code": "+381",
      "name": "Serbia"
    },
    {
      "code": "+248",
      "name": "Seychelles"
    },
    {
      "code": "+232",
      "name": "Sierra Leone"
    },
    {
      "code": "+65",
      "name": "Singapore"
    },
    {
      "code": "+421",
      "name": "Slovakia"
    },
    {
      "code": "+386",
      "name": "Slovenia"
    },
    {
      "code": "+677",
      "name": "Solomon Islands"
    },
    {
      "code": "+27",
      "name": "South Africa"
    },
    {
      "code": "+500",
      "name": "South Georgia and the South Sandwich Islands"
    },
    {
      "code": "+82",
      "name": "South Korea"
    },
    {
      "code": "+34",
      "name": "Spain"
    },
    {
      "code": "+94",
      "name": "Sri Lanka"
    },
    {
      "code": "+249",
      "name": "Sudan"
    },
    {
      "code": "+597",
      "name": "Suriname"
    },
    {
      "code": "+268",
      "name": "Swaziland"
    },
    {
      "code": "+46",
      "name": "Sweden"
    },
    {
      "code": "+41",
      "name": "Switzerland"
    },
    {
      "code": "+963",
      "name": "Syria"
    },
    {
      "code": "+886",
      "name": "Taiwan"
    },
    {
      "code": "+992",
      "name": "Tajikistan"
    },
    {
      "code": "+255",
      "name": "Tanzania"
    },
    {
      "code": "+66",
      "name": "Thailand"
    },
    {
      "code": "+670",
      "name": "Timor Leste"
    },
    {
      "code": "+228",
      "name": "Togo"
    },
    {
      "code": "+690",
      "name": "Tokelau"
    },
    {
      "code": "+676",
      "name": "Tonga"
    },
    {
      "code": "+216",
      "name": "Tunisia"
    },
    {
      "code": "+90",
      "name": "Turkey"
    },
    {
      "code": "+993",
      "name": "Turkmenistan"
    },
    {
      "code": "+688",
      "name": "Tuvalu"
    },
    {
      "code": "+256",
      "name": "Uganda"
    },
    {
      "code": "+380",
      "name": "Ukraine"
    },
    {
      "code": "+971",
      "name": "United Arab Emirates"
    },
    {
      "code": "+44",
      "name": "United Kingdom"
    },
    {
      "code": "+598",
      "name": "Uruguay"
    },
    {
      "code": "+998",
      "name": "Uzbekistan"
    },
    {
      "code": "+678",
      "name": "Vanuatu"
    },
    {
      "code": "+58",
      "name": "Venezuela"
    },
    {
      "code": "+84",
      "name": "Vietnam"
    },
    {
      "code": "+681",
      "name": "Wallis and Futuna"
    },
    {
      "code": "+967",
      "name": "Yemen"
    },
    {
      "code": "+260",
      "name": "Zambia"
    },
    {
      "code": "+255",
      "name": "Zanzibar"
    },
    {
      "code": "+263",
      "name": "Zimbabwe"
    }
  ];

  getCountryCodes() {
    return this.countryMobileCodes;
  }
}
