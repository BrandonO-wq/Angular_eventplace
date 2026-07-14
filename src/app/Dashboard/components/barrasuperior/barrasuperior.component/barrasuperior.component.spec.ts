import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarrasuperiorComponent } from './barrasuperior.component';

import { RouterLink, RouterLinkActive } from '@angular/router';

describe('BarrasuperiorComponent', () => {
  let component: BarrasuperiorComponent;
  let fixture: ComponentFixture<BarrasuperiorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarrasuperiorComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(BarrasuperiorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
