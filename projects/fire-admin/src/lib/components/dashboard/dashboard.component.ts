import { Component, OnInit, OnDestroy } from '@angular/core';
import { PostsService } from '../../services/collections/posts.service';
import { UsersService } from '../../services/collections/users.service';
import { Observable, Subscription, Subject } from 'rxjs';
import { Post, PostStatus } from '../../models/collections/post.model';
import { Language } from '../../models/language.model';
import { Category } from '../../models/collections/category.model';
import { SettingsService } from '../../services/settings.service';
import { CategoriesService } from '../../services/collections/categories.service';
import { map, takeUntil } from 'rxjs/operators';
import { NavigationService } from '../../services/navigation.service';
import { initPieChart } from '../../helpers/charts.helper';
import { I18nService } from '../../services/i18n.service';
import { CurrentUserService } from '../../services/current-user.service';
import { UserRole } from '../../models/collections/user.model';

type PostByStatus = {
  label: string,
  count: number
};

@Component({
  selector: 'fa-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  statistics: { posts?: number, users?: number } = {};
  latestPosts: Observable<Post[]>;
  postsLanguage: string;
  postsByStatus: Observable<PostByStatus[]>;
  postsByStatusLanguage: string;
  languages: Language[];
  allPostsStatus: { labels: object, colors: object };
  allPostsCategories: Category[] = [];
  private subscription: Subscription = new Subscription();
  private postsLanguageChange: Subject<void> = new Subject<void>();
  private postsByStatusLanguageChange: Subject<void> = new Subject<void>();

  constructor(
    private posts: PostsService,
    private users: UsersService,
    private categories: CategoriesService,
    private settings: SettingsService,
    public navigation: NavigationService,
    public currentUser: CurrentUserService,
    private i18n: I18nService
  ) { }

  ngOnInit() {
    // Get statistics
    this.getStatistics();
    // Get languages
    this.languages = this.settings.getActiveSupportedLanguages();
    this.postsLanguage = '*';//this.languages[0].key;
    this.postsByStatusLanguage = '*';//this.languages[0].key;
    // Get all posts status
    this.allPostsStatus = this.posts.getAllStatusWithColors();
    // Get all posts categories
    this.subscription.add(
      this.categories.getAll().pipe(map((categories: Category[]) => {
        const allCategories: Category[] = [];
        categories.forEach((category: Category) => {
          allCategories[category.id] = category;
        });
        return allCategories;
      })).subscribe((categories: Category[]) => {
        // console.log(categories);
        this.allPostsCategories = categories;
      })
    );
    // Get latest posts
    this.getLatestPosts();
    // Get posts by status
    this.getPostsByStatus();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.postsLanguageChange.next();
    this.postsByStatusLanguageChange.next();
  }

  private async getStatistics() {
    this.statistics.posts = await this.posts.countWhere('createdBy', '==', this.currentUser.data.id);
  }

  private getLatestPosts() {
    this.latestPosts = this.posts.getWhereFn(ref => {
      let query: any = ref;
      // Filter by lang
      if (this.postsLanguage !== '*') {
        query = query.where('lang', '==', this.postsLanguage);
      }
      query = query.where('createdBy', '==', this.currentUser.data.id);
      return query;
    }, true).pipe(
      map((posts: Post[]) => {
        if (this.currentUser.isAdmin()) {
          let uniqueUser = [];
          posts.forEach(p => {
            if(uniqueUser.indexOf(p.createdFor) === -1) {
              uniqueUser.push(p.createdFor)
            }
          })
          this.statistics.users = uniqueUser.length;
        }
        return posts.sort((a: Post, b: Post) => b.createdAt - a.createdAt).slice(0, 5);
      }),
      takeUntil(this.postsLanguageChange)
    );
  }

  onPostsLanguageChange() {
    this.postsLanguageChange.next();
    this.getLatestPosts();
  }

  private getPostsByStatus() {
    this.postsByStatus = this.posts.getWhereFn(ref => {
      let query: any = ref;
      // Filter by lang
      if (this.postsByStatusLanguage !== '*') {
        query = query.where('lang', '==', this.postsByStatusLanguage);
      }
      query = query.where('createdBy', '==', this.currentUser.data.id);
      return query;
    }, true).pipe(
      map((posts: Post[]) => {
        let postsByStatus: PostByStatus[] = [];
        Object.keys(PostStatus).forEach((key: string) => {
          postsByStatus[PostStatus[key]] = {
            label: key,
            count: 0
          };
        });
        // Get status count
        posts.forEach((post: Post) => {
          postsByStatus[post.status].count += 1;
        })
        return postsByStatus;
      }),
      takeUntil(this.postsByStatusLanguageChange)
    );
    this.subscription.add(
      this.postsByStatus.subscribe((postsByStatus: PostByStatus[]) => {
        const data = Object.keys(postsByStatus).map((key: string) => postsByStatus[key].count);
        const labels = Object.keys(postsByStatus).map((key: string) => this.i18n.get(postsByStatus[key].label));
        // setTimeout(() => { // setTimeout used to wait for canvas html element to render
        //   initPieChart('#posts-by-status', data, labels);
        // }, 250);
      })
    );
  }

  onPostsByStatusLanguageChange() {
    this.postsByStatusLanguageChange.next();
    this.getPostsByStatus();
  }

}
