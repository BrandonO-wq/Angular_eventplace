import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrecimientoPlataforma } from './crecimiento-plataforma';

describe('CrecimientoPlataforma', () => {
  let component: CrecimientoPlataforma;
  let fixture: ComponentFixture<CrecimientoPlataforma>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrecimientoPlataforma]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrecimientoPlataforma);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
