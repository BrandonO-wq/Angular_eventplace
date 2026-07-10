import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DistribucionDeporte } from './distribucion-deporte';

describe('DistribucionDeporte', () => {
  let component: DistribucionDeporte;
  let fixture: ComponentFixture<DistribucionDeporte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistribucionDeporte]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DistribucionDeporte);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
