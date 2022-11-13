import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { initTextEditor } from '../../../helpers/posts.helper';
import { I18nService } from '../../../services/i18n.service';
import { SettingsService } from '../../../services/settings.service';
import { slugify } from '../../../helpers/functions.helper';
import { Language } from '../../../models/language.model';
import { CategoriesService } from '../../../services/collections/categories.service';
import { DiagnosisService } from '../../../services/collections/diagnosis.service';
import { Category } from '../../../models/collections/category.model';
import { Observable, Subject, of, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, tap, switchMap, takeUntil } from 'rxjs/operators';
import { AlertService } from '../../../services/alert.service';
import { PostsService } from '../../../services/collections/posts.service';
import { NavigationService } from '../../../services/navigation.service';
import { PostStatus } from '../../../models/collections/post.model';
import { getEmptyImage } from '../../../helpers/assets.helper';
import { UsersService } from '../../../services/collections/users.service';
import { User } from '../../../models/collections/user.model';
import * as firebase from 'firebase';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'fa-posts-add',
  templateUrl: './posts-add.component.html',
  styleUrls: ['./posts-add.component.css']
})
export class PostsAddComponent implements OnInit, AfterViewInit, OnDestroy {

  title: string;
  editor: any;
  notes: any;
  private status: PostStatus;
  language: string;
  languages: Language[];
  slug: string;
  date: string;
  idate: string;
  private image: File;
  imageSrc: string|ArrayBuffer;
  checkedCategories: string[] = [];
  checkedDiagnosis: string[] = [];
  categoriesObservable: Observable<Category[]>;
  diagnosisObservable: Observable<Category[]>;
  newCategory: string;
  newDiagnosis: string;
  isSubmitButtonsDisabled: boolean = false;
  private languageChange: Subject<void> = new Subject<void>();
  private subscription: Subscription = new Subscription()

  constructor(
    private i18n: I18nService,
    private settings: SettingsService,
    private categories: CategoriesService,
    private diagnosis: DiagnosisService,
    private alert: AlertService,
    private posts: PostsService,
    private navigation: NavigationService,
    private users: UsersService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.title = new Date().getTime() + '';
    this.slug = slugify(this.title).substr(0, 50);
    this.status = PostStatus.Draft;
    this.languages = this.settings.getActiveSupportedLanguages();
    this.language = this.languages[0].key;
    this.date = new Date().toISOString().slice(0, 10);
    this.idate = new Date().toISOString().slice(0, 10);
    this.image = null;
    this.imageSrc = getEmptyImage();
    this.setCategoriesObservable();

    this.subscription.add(
      this.route.params.subscribe((params: { patient: string }) => {
          if(params.patient) {
            let createdFor = this.users.get(params.patient);
            this.subscription.add(
              createdFor.subscribe((user: User) => {
                this.patient = user;
              })
            );
          }
      })
    )
  }

  ngAfterViewInit() {
    this.editor = initTextEditor('#editor-container', this.i18n.get('PostContent'));
    this.notes = initTextEditor('#note-container', this.i18n.get('Notes'));
  }

  ngOnDestroy() {
    this.languageChange.next();
  }

  patient: User;
  searching = false;
  searchFailed = false;

  searchFn(text$: Observable<string>)  {
    return text$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.searching = true
      }),
      switchMap(term => {
        if (term === '') {
          return of([]);
        }
    
        return this.users.getAll().pipe(
            map(response => {
              return response.filter(d => d.role === 'patient' && 
              (d.firstName.toLowerCase().indexOf(term.toLowerCase()) > -1 || 
              d.lastName.toLowerCase().indexOf(term.toLowerCase()) > -1));
            })
          ).pipe(
          tap(() => this.searchFailed = false),
          catchError(() => {
            this.searchFailed = true;
            return of([]);
          }))
      }),
      tap(() => this.searching = false)
    )
  }

  search = this.searchFn.bind(this);

  formatter = (d: User) => {
    console.log(d);
    return d.firstName + ' ' + d.lastName
  };

  private setCategoriesObservable() {
    this.categoriesObservable = this.categories.getWhere('lang', '==', this.language).pipe(
      map((categories: Category[]) => {
        categories.forEach(c => {
          c.selected = this.checkedCategories.indexOf(c.id) > -1;
        });
        return categories.sort((a: Category, b: Category) => b.createdAt - a.createdAt);
      }),
      takeUntil(this.languageChange)
    );

    this.setDiagnosisObservable();
  }

  private setDiagnosisObservable() {
    this.diagnosisObservable = this.diagnosis.getWhere('lang', '==', this.language).pipe(
      map((diagnosis: Category[]) => {
        diagnosis.forEach(c => {
          c.selected = this.checkedDiagnosis.indexOf(c.id) > -1;
        });
        return diagnosis.sort((a: Category, b: Category) => b.createdAt - a.createdAt);
      }),
      takeUntil(this.languageChange)
    );
  }

  onTitleInput() {
    this.slug = slugify(this.title).substr(0, 50);
  }

  onLanguageChange() {
    this.languageChange.next();
    this.checkedCategories = [];
    this.setCategoriesObservable();
  }

  addCategory(event: Event) {
    const target = event.target as any;
    target.disabled = true;
    this.categories.add({
      label: this.newCategory,
      slug: slugify(this.newCategory),
      lang: this.language
    }).catch((error: Error) => {
      this.alert.error(error.message);
    }).finally(() => {
      this.newCategory = '';
    });
  }

  addDiagnosis(event: Event) {
    const target = event.target as any;
    target.disabled = true;
    this.diagnosis.add({
      label: this.newDiagnosis,
      slug: slugify(this.newDiagnosis),
      lang: this.language
    }).catch((error: Error) => {
      this.alert.error(error.message);
    }).finally(() => {
      this.newDiagnosis = '';
    });
  }

  onCategoryCheck(category: Category, event: Event|any, list: string[]) {
    if (event.target.checked) {
      list.push(category.id);
    } else {
      const index = list.indexOf(category.id);
      if (index !== -1) {
        list.splice(index, 1);
      }
    }
  }

  onImageChange(event: Event) {
    this.image = (event.target as HTMLInputElement).files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.imageSrc = reader.result;
    };
    reader.readAsDataURL(this.image);
  }

  uniqueItems(list: string[]): string[] {
    let uniqueCats: string[] = [];
    list.forEach(c => {
      if(uniqueCats.indexOf(c) === -1) {
        uniqueCats.push(c);
      }
    });

    return uniqueCats;
  }

  addPost(event: Event, status?: PostStatus) {
    if(!this.patient) {
      this.alert.error(this.i18n.get('PatientNotSeleted'), false, 5000);
      return;
    }
    const target = event.target as any;
    const startLoading = () => {
      target.isLoading = true;
      this.isSubmitButtonsDisabled = true;
    };
    const stopLoading = () => {
      target.isLoading = false;
      this.isSubmitButtonsDisabled = false;
    };
    startLoading();
    
    if (status) {
      this.status = status;
    }
    this.posts.add({
      lang: this.language,
      title: this.title,
      slug: this.slug,
      date: new Date(this.date).getTime(),
      idate: new Date(this.idate).getTime(),
      content: this.editor.root.innerHTML,
      notes: this.notes.root.innerHTML,
      image: this.image,
      status: this.status,
      categories: this.uniqueItems(this.checkedCategories),
      diagnosis: this.uniqueItems(this.checkedDiagnosis),
      createdFor: this.patient.id,
      patientName: this.patient.firstName + ' ' + this.patient.lastName
    }).then(() => {
      this.alert.success(this.i18n.get('PostAdded'), false, 5000, true);
      this.navigation.redirectTo('users', 'profile', this.patient.id);
      let sendMessage = firebase.functions().httpsCallable('sendMessageHttp');
      sendMessage({
        mobile: (this.patient.mcode || '+1') + this.patient.mobile,
        user: this.patient.id,
        host: window.location.origin
      }).then((result) => {
        alert('Message Sent');
      })
    }).catch((error: Error) => {
      this.alert.error(error.message);
    }).finally(() => {
      stopLoading();
    });
  }

  publishPost(event: Event) {
    this.addPost(event, PostStatus.Published);
  }

}
