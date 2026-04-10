import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  speakers = [
    { name: 'Speaker 1', topic: 'Angular Microfrontends' },
    { name: 'Speaker 2', topic: 'Module Federation in Depth' },
    { name: 'Speaker 3', topic: 'Standalone Components' },
  ];
}
