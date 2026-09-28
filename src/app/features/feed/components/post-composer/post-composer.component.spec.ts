import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostComposerComponent } from './post-composer.component';

describe('PostComposerComponent', () => {
  let fixture: ComponentFixture<PostComposerComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PostComposerComponent] }).compileComponents();
    fixture = TestBed.createComponent(PostComposerComponent);
    fixture.componentRef.setInput('maxLength', 10);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  const textarea = () => element.querySelector('textarea') as HTMLTextAreaElement;
  const button = () => element.querySelector('button[type="submit"]') as HTMLButtonElement;

  async function type(value: string): Promise<void> {
    textarea().value = value;
    textarea().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('disables publishing while the message is empty', () => {
    expect(button().disabled).toBe(true);
  });

  it('shows remaining characters and blocks messages over the limit', async () => {
    await type('12345678901');

    expect(element.querySelector('.composer__counter')?.textContent?.trim()).toBe('-1');
    expect(button().disabled).toBe(true);
  });

  it('emits the trimmed message on submit', async () => {
    const emitted: string[] = [];
    fixture.componentInstance.submitted.subscribe((m) => emitted.push(m));

    await type('  hola  ');
    element.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(emitted).toEqual(['hola']);
  });

  it('clears the form when the reset token changes', async () => {
    await type('hola');
    fixture.componentRef.setInput('resetToken', 1);
    await fixture.whenStable();

    expect(textarea().value).toBe('');
  });
});
