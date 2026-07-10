import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopSalones } from './top-salones';

describe('TopSalones', () => {
  let component: TopSalones;
  let fixture: ComponentFixture<TopSalones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopSalones]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TopSalones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
