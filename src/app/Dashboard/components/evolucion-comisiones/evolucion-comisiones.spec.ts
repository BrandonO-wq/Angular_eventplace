import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvolucionComisiones } from './evolucion-comisiones';

describe('EvolucionComisiones', () => {
  let component: EvolucionComisiones;
  let fixture: ComponentFixture<EvolucionComisiones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvolucionComisiones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvolucionComisiones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
