import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should enable submit button for simple text credentials', () => {
    const usernameInput = fixture.nativeElement.querySelector('input[name="username"]') as HTMLInputElement;
    const passwordInput = fixture.nativeElement.querySelector('input[name="password"]') as HTMLInputElement;

    usernameInput.value = 'admin';
    usernameInput.dispatchEvent(new Event('input'));
    passwordInput.value = '1234';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton.disabled).toBeFalse();
  });
});
