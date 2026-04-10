import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  user = {
    name: 'NgIndia Attendee',
    email: 'attendee@ngindia.dev',
    role: 'Angular Developer',
    joinedYear: 2024,
  };
}
