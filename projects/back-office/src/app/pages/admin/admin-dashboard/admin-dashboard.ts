import {Component, OnInit} from '@angular/core';
import {RichTextEditor} from 'shared-lib';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    RichTextEditor,
    FormsModule
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit{
  articleContent: string = '';

  ngOnInit(): void {
    this.articleContent = `<h2>Bienvenue dans le nouvel éditeur !</h2><p>Ceci est un test de l'éditeur de texte riche basé sur <code>contenteditable</code> pur.</p><ul><li>Liste à puce</li><li>Deuxième élément</li></ul>`;
  }
}
