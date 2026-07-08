import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopCanchas } from './top-canchas';

describe('TopCanchas', () => {
  let component: TopCanchas;
  let fixture: ComponentFixture<TopCanchas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopCanchas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopCanchas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
