import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarralateralComponent } from './barralateral.component';

describe('BarralateralComponent', () => {
  let component: BarralateralComponent;
  let fixture: ComponentFixture<BarralateralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarralateralComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BarralateralComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
