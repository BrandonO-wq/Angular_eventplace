import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeudaVencida } from './deuda-vencida';

describe('DeudaVencida', () => {
  let component: DeudaVencida;
  let fixture: ComponentFixture<DeudaVencida>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeudaVencida]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeudaVencida);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
