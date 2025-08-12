import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TokenRefreshDemoComponent } from './token-refresh-demo.component';

describe('TokenRefreshDemoComponent', () => {
  let component: TokenRefreshDemoComponent;
  let fixture: ComponentFixture<TokenRefreshDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TokenRefreshDemoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TokenRefreshDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
