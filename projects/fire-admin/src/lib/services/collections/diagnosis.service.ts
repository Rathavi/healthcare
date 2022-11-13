import { Injectable } from '@angular/core';
import { DatabaseService } from '../database.service';
import { Category } from '../../models/collections/category.model';
import { now } from '../../helpers/functions.helper';
import { map } from 'rxjs/operators';

@Injectable()
export class DiagnosisService {

  constructor(private db: DatabaseService) { }

  add(data: Category) {
    const category: Category = {
      label: data.label,
      slug: data.slug,
      lang: data.lang,
      createdAt: now(), // timestamp
      updatedAt: null,
      createdBy: this.db.currentUser.id,
      updatedBy: null
    };
    return this.db.addDocument('diagnosis', category);
  }

  get(id: string) {
    return this.db.getDocument('diagnosis', id).pipe(map((category: Category) => {
      category.id = id;
      return category;
    }));
  }

  getAll() {
    return this.db.getCollection('diagnosis');
  }

  getWhere(field: string, operator: firebase.firestore.WhereFilterOp, value: string) {
    return this.db.getCollection('diagnosis', ref => ref.where(field, operator, value));
  }

  edit(id: string, data: Category) {
    const category: Category = {
      label: data.label,
      slug: data.slug,
      lang: data.lang,
      updatedAt: now(),
      updatedBy: this.db.currentUser.id
    };
    return this.db.setDocument('diagnosis', id, category);
  }

  delete(id: string) {
    return this.db.deleteDocument('diagnosis', id);
  }

}
