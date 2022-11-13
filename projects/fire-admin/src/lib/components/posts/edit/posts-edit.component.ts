import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { initTextEditor } from '../../../helpers/posts.helper';
import { I18nService } from '../../../services/i18n.service';
import { slugify } from '../../../helpers/functions.helper';
import { CategoriesService } from '../../../services/collections/categories.service';
import { DiagnosisService } from '../../../services/collections/diagnosis.service';
import { Category } from '../../../models/collections/category.model';
import { Observable, Subscription, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, tap, switchMap, take, takeUntil } from 'rxjs/operators';
import { AlertService } from '../../../services/alert.service';
import { PostsService } from '../../../services/collections/posts.service';
import { NavigationService } from '../../../services/navigation.service';
import { Post, PostStatus } from '../../../models/collections/post.model';
import { getEmptyImage } from '../../../helpers/assets.helper';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../../../services/collections/users.service';
import { User } from '../../../models/collections/user.model';

@Component({
  selector: 'fa-posts-edit',
  templateUrl: './posts-edit.component.html',
  styleUrls: ['./posts-edit.component.css']
})
export class PostsEditComponent implements OnInit, AfterViewInit, OnDestroy {

  private id: string;
  title: string;
  editor: any;
  notes: any;
  status: PostStatus;
  language: string;
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
  allStatus: object|any = {};
  private subscription: Subscription = new Subscription();
  private routeParamsChange: Subject<void> = new Subject<void>();

  constructor(
    private i18n: I18nService,
    private categories: CategoriesService,
    private diagnosis: DiagnosisService,
    private alert: AlertService,
    private posts: PostsService,
    public navigation: NavigationService,
    private route: ActivatedRoute,
    private users: UsersService
  ) { }

  ngOnInit() {
    this.allStatus = this.posts.getAllStatus();
    this.isSubmitButtonsDisabled = true;
    this.subscription.add(
      this.route.params.subscribe((params: { id: string }) => {
        
        this.posts.get(params.id).pipe(take(1)).toPromise().then((post: Post) => {
          if (post) {
            this.id = post.id;
            this.title = post.title;
            this.editor.root.innerHTML = post.content;
            this.notes.root.innerHTML = post.notes;
            this.status = post.status;
            this.slug = post.slug;
            this.date = new Date(post.date).toISOString().slice(0, 10);
            this.idate = new Date(post.idate).toISOString().slice(0, 10);
            this.language = post.lang;
            this.image = null;
            this.imageSrc = getEmptyImage();
            if (post.image) {
              this.posts.getImageUrl(post.image as  string).pipe(take(1)).toPromise().then((imageUrl: string) => {
                this.imageSrc = imageUrl;
              });
            }
            this.checkedCategories = post.categories ? post.categories : [];
            this.checkedDiagnosis = post.diagnosis ? post.diagnosis : [];
            this.routeParamsChange.next();
            this.setCategoriesObservable();
            
            let createdFor = this.users.get(post.createdFor);
            this.subscription.add(
              createdFor.subscribe((user: User) => {
                this.patient = user;
                this.isSubmitButtonsDisabled = false;
              })
            );
          } else {
            this.navigation.redirectTo('dashboard');
          }
        });
      })
    );
  }

  ngAfterViewInit() {
    this.editor = initTextEditor('#editor-container', this.i18n.get('PostContent'));
    this.notes = initTextEditor('#note-container', this.i18n.get('Notes'));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.routeParamsChange.next();
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
      takeUntil(this.routeParamsChange)
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
      takeUntil(this.routeParamsChange)
    );
  }

  onTitleInput() {
    this.slug = slugify(this.title).substr(0, 50);
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

  savePost(event: Event) {
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
    // Check if post slug is duplicated
    const data: Post = {
      lang: this.language,
      title: this.title,
      slug: this.slug,
      date: new Date(this.date).getTime(),
      idate: new Date(this.idate).getTime(),
      content: this.editor.root.innerHTML,
      notes: this.notes.root.innerHTML,
      status: this.status,
      categories: this.uniqueItems(this.checkedCategories),
      diagnosis: this.uniqueItems(this.checkedDiagnosis),
      createdFor: this.patient.id,
      patientName: this.patient.firstName + ' ' + this.patient.lastName
    };
    if (this.image) {
      data.image = this.image;
    }
    this.posts.edit(this.id, data).then(() => {
      this.alert.success(this.i18n.get('PostSaved'), false, 5000, true);
      this.navigation.redirectTo('users', 'profile', this.patient.id);
    }).catch((error: Error) => {
      this.alert.error(error.message);
    }).finally(() => {
      stopLoading();
    });
  }

}
