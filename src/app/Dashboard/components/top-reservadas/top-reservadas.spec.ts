import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopReservadas } from './top-reservadas';

describe('TopReservadas', () => {
  let component: TopReservadas;
  let fixture: ComponentFixture<TopReservadas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopReservadas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopReservadas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
