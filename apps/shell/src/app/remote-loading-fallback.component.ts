import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-remote-error',
  standalone: true,
  template: `
    <div class="error">
      <span class="icon">⚠️</span>
      <h3>{{ remoteName }} is unavailable</h3>
      <p>The remote application failed to load. This is expected if the remote is not running.</p>
      <button (click)="onRetry()">Try Again</button>
    </div>
  `,
  styles: [`
    .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
    }
    .icon { font-size: 2.5rem; }
    h3 { margin: 1rem 0 0.5rem; color: #d32f2f; }
    p { color: #757575; max-width: 400px; margin: 0 0 1.5rem; }
    button {
      background: #3f51b5;
      color: white;
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      &:hover { background: #303f9f; }
    }
  `],
})
export class RemoteErrorComponent {
  remoteName = inject(ActivatedRoute).snapshot.data['remoteName'] ?? 'Remote';

  onRetry() {
    window.location.reload();
  }
}
